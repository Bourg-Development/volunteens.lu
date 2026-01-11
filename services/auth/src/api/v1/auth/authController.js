const { User, Session, ORGANIZATION_TYPES, ACCOUNT_STATUSES, ROLES, OTP, OTP_TYPES } = require('../../../database');
const jwtConfig = require('../../../config/jwt');
const logger = require('../../../utils/logger');
const servicesConfig = require('../../../config/services');
const emailClient = require('../../../services/emailClient');

const {
    generateAccessToken,
    generateRefreshToken,
    generateFingerprint,
    hashToken,
    getClientInfo,
    verifyAccessToken,
    verifyRefreshToken,
    cookieOptions,
} = require('./authUtils');
const {or} = require("sequelize");

exports.register = async (req, res) => {
    try {
        // accountType in frontend maps to role in backend
        const { email, password, accountType, firstName, lastName, organizationName, organizationType, acceptTerms } = req.body;

        if (!email || !password || !accountType) {
            return res.status(400).json({ error: 'Email, password, and account type are required' });
        }

        // Validate terms acceptance
        if (!acceptTerms) {
            return res.status(400).json({ error: 'You must accept the Terms of Service and Privacy Policy' });
        }

        // Only allow student and organization for public registration
        if (accountType !== 'student' && accountType !== 'organization') {
            return res.status(400).json({ error: 'Invalid account type' });
        }

        // Validate required fields based on account type
        if (accountType === 'student') {
            if (!firstName || !lastName) {
                return res.status(400).json({ error: 'First name and last name are required for students' });
            }
        } else if (accountType === 'organization') {
            if (!organizationName) {
                return res.status(400).json({ error: 'Organization name is required' });
            }
            if (organizationType && !ORGANIZATION_TYPES.values.includes(organizationType)) {
                return res.status(400).json({ error: 'Invalid organization type' });
            }
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const userData = {
            email,
            password,
            role: accountType, // accountType becomes role
            termsAcceptedAt: new Date(),
        };

        if (accountType === 'student') {
            userData.firstName = firstName;
            userData.lastName = lastName;
            userData.accountStatus = ACCOUNT_STATUSES.PENDING_VE;
            const user = await User.create(userData);

            const userOTP= await OTP.create({
                userId: user.id,
                type: OTP_TYPES.EMAIL_VERIFICATION
            });

            emailClient.sendEmailVerificationCode({
                to: user.email,
                studentName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
                otp: userOTP.token
            }).catch(err => logger.error('Failed to send OTP verification email: \n' + err));
            return res.status(201).redirect(`/login?success=1&msg=${encodeURIComponent('We have send you a link. Please verify your email.')}`);
        } else if (accountType === 'organization') {
            userData.organizationName = organizationName;
            userData.accountStatus = ACCOUNT_STATUSES.PENDING_AP;
            userData.organizationType = organizationType || null;
            const user = await User.create(userData);

            emailClient.sendOrgSignupPending({
                to: user.email,
                organizationName: user.organizationName,
            }).catch(err => logger.error('Failed to send org signup pending email: \n' + err));

            return res.status(201).redirect(`/login?success=1&msg=${encodeURIComponent('Your account is awaiting administrator approval. A sales rep will contact you asap.')}`);
        }
    } catch (err) {
        logger.error('Registration error:', err);
        return res.status(500).json({ error: 'Registration failed' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, deviceName } = req.body;

        if (!email || !password) {
            return res.status(401).redirect(`/login?success=0&msg=${encodeURIComponent('Email and password are required.')}`);
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).redirect(`/login?success=0&msg=${encodeURIComponent('Invalid credentials.')}`);
        }

        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            return res.status(401).redirect(`/login?success=0&msg=${encodeURIComponent('Invalid credentials.')}`);
        }

        if(user.accountStatus !== ACCOUNT_STATUSES.ACTIVE){
            return res.status(401).redirect(`/login?success=0&msg=${encodeURIComponent('Your account is not active.')}`);
        }

        const fingerprint = generateFingerprint();
        const clientInfo = getClientInfo(req);

        const session = await Session.create({
            userId: user.id,
            refreshTokenHash: '',
            fingerprint: hashToken(fingerprint),
            userAgent: clientInfo.userAgent,
            ipAddress: clientInfo.ipAddress,
            deviceName: deviceName || null,
            lastUsedAt: new Date(),
            expiresAt: new Date(Date.now() + jwtConfig.refreshToken.expiresInMs),
        });

        const accessToken = generateAccessToken(user, session.id);
        const refreshToken = generateRefreshToken(user, session.id);

        await session.update({ refreshTokenHash: hashToken(refreshToken) });

        res.cookie('accessToken', accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000,
            path: '/',
        });

        res.cookie('refreshToken', refreshToken, {
            ...cookieOptions,
            maxAge: jwtConfig.refreshToken.expiresInMs,
            path: '/api/v1/auth/refresh',
        });

        res.cookie('fingerprint', fingerprint, {
            ...cookieOptions,
            maxAge: jwtConfig.refreshToken.expiresInMs,
            path: '/api/v1/auth/refresh',
        });

        const userResponse = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        if (user.role === ROLES.STUDENT) {
            userResponse.firstName = user.firstName;
            userResponse.lastName = user.lastName;
        } else if (user.role === ROLES.ORGANIZATION) {
            userResponse.organizationName = user.organizationName;
        }

        // Regular users (student, organization) go to dashboard, staff goes to admin
        if (user.role === ROLES.STUDENT || user.role === ROLES.ORGANIZATION) {
            return res.status(200).redirect(servicesConfig.dash);
        }
        return res.status(200).redirect(servicesConfig.admin)
    } catch (err) {
        logger.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
};

exports.verify = async (req, res) => {
    try{
        const token = req.params.token;
        if(!token){
            return res.status(400).redirect('/login');
        }
        const userOTP = await OTP.findOne({
            where: {
                token: token,
            },
            include: [User],
        });

        if(!userOTP){
            return res.status(401).redirect(`/login?success=0&msg=${encodeURIComponent('Invalid verification token.')}`);
        }

        const user = userOTP.User;

        if(new Date() > userOTP.expiresAt){
            return res.status(401).redirect(`/login?success=0&msg=${encodeURIComponent('Invalid verification token.')}`);
        }

        await user.update({ accountStatus: ACCOUNT_STATUSES.ACTIVE })
        await userOTP.update({used: true, usedAt: Date()})

        emailClient.sendWelcomeStudent({
            to: user.email,
            studentName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
            dashboardUrl: servicesConfig.dash,
        }).catch(err => logger.error('Failed to send student welcome email: ' + err));

        return res.status(200).redirect(`/login?success=1&msg=${encodeURIComponent('Your email has successfully been verified. You may login now.')}`)
    } catch (err) {
        logger.error('Verification error:', err);
        res.status(500).json({ error: 'Verification failed' });
    }
}

exports.refresh = async (req, res) => {
    try {
        const { refreshToken, fingerprint } = req.cookies;

        if (!refreshToken || !fingerprint) {
            return res.status(401).redirect(`/login`);
        }

        let payload;
        try {
            payload = verifyRefreshToken(refreshToken);
        } catch (err) {
            destroySession(res)
            return res.status(401).redirect(`/login?success=0&msg=${encodeURIComponent('Invalid refresh token.')}`);
        }

        const session = await Session.findOne({
            where: {
                id: payload.sessionId,
                revoked: false,
            },
            include: [User],
        });

        if (!session) {
            destroySession(res);
            return res.status(401).redirect(`/login?success=0&msg=${encodeURIComponent('Your sessions is invalid.')}`);
        }

        if (session.refreshTokenHash !== hashToken(refreshToken)) {
            await session.update({ revoked: true });
            destroySession(res);
            logger.warn(`Refresh token hash mismatch for session ${session.id} - possible token reuse`);
            return res.status(401).redirect(`/login?success=0&msg=${encodeURIComponent('Your sessions is invalid.')}`);
        }

        if (new Date() > session.expiresAt) {
            await session.update({ revoked: true });
            destroySession(res);
            return res.status(401).redirect(`/login?success=0&msg=${encodeURIComponent('Your sessions has expired.')}`);
        }

        if (session.fingerprint !== hashToken(fingerprint)) {
            await session.update({ revoked: true });
            destroySession(res);
            logger.warn(`Fingerprint mismatch for session ${session.id}`);
            return res.status(401).redirect(`/login?success=0&msg=${encodeURIComponent('Your sessions is invalid.')}`);
        }

        const user = session.User;
        const newAccessToken = generateAccessToken(user, session.id);
        const newRefreshToken = generateRefreshToken(user, session.id);

        await session.update({
            refreshTokenHash: hashToken(newRefreshToken),
            lastUsedAt: new Date(),
        });

        res.cookie('accessToken', newAccessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000,
            path: '/',
        });

        res.cookie('refreshToken', newRefreshToken, {
            ...cookieOptions,
            maxAge: jwtConfig.refreshToken.expiresInMs,
            path: '/api/v1/auth/refresh',
        });

        res.json({ message: 'Tokens refreshed' });
    } catch (err) {
        logger.error('Refresh error:', err);
        res.status(500).json({ error: 'Token refresh failed' });
    }
};

exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;

        if (refreshToken) {
            try {
                const payload = verifyRefreshToken(refreshToken);
                await Session.update(
                    { revoked: true },
                    { where: { id: payload.sessionId } }
                );
            } catch (err) {
                // Token invalid, just clear cookies
            }
        }

        destroySession(res)
        res.status(200).redirect(`/login?success=1&msg=${encodeURIComponent('Your have successfully logged out.')}`);
    } catch (err) {
        logger.error('Logout error:', err);
        res.status(500).json({ error: 'Logout failed' });
    }
};

exports.status = async (req, res) => {
    try {
        const { accessToken } = req.cookies;

        if (!accessToken) {
            return res.json({ authenticated: false });
        }

        let payload;
        try {
            payload = verifyAccessToken(accessToken);
        } catch (err) {
            return res.json({ authenticated: false, reason: 'invalid_token' });
        }

        const session = await Session.findOne({
            where: { id: payload.sessionId, revoked: false },
        });

        if (!session) {
            return res.json({ authenticated: false, reason: 'session_revoked' });
        }

        const user = await User.findByPk(payload.id, {
            attributes: ['id', 'email', 'role', 'firstName', 'lastName', 'organizationName'],
        });

        if (!user) {
            return res.json({ authenticated: false, reason: 'user_not_found' });
        }

        const userResponse = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        if (user.role === ROLES.STUDENT) {
            userResponse.firstName = user.firstName;
            userResponse.lastName = user.lastName;
        } else if (user.role === ROLES.ORGANIZATION) {
            userResponse.organizationName = user.organizationName;
        }

        res.json({
            authenticated: true,
            user: userResponse,
        });
    } catch (err) {
        logger.error('Status check error:', err);
        res.status(500).json({ error: 'Status check failed' });
    }
};
function destroySession(res){
    res.clearCookie('accessToken', { ...cookieOptions, path: '/' });
    res.clearCookie('refreshToken', { ...cookieOptions, path: '/api/v1/auth/refresh' });
    res.clearCookie('fingerprint', { ...cookieOptions, path: '/api/v1/auth/refresh' });
}

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const user = req.user;

        const profile = {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            dateOfBirth: user.dateOfBirth,
            phone: user.phone,
            street: user.street,
            city: user.city,
            postalCode: user.postalCode,
            country: user.country,
            iban: user.iban,
            bic: user.bic,
            bankName: user.bankName,
            accountHolderName: user.accountHolderName,
            profileComplete: user.profileComplete,
        };

        res.json({ success: true, profile });
    } catch (err) {
        logger.error('Get profile error:', err);
        res.status(500).json({ success: false, error: 'Failed to get profile' });
    }
};

// Update user profile (for completing profile after first login)
exports.updateProfile = async (req, res) => {
    try {
        const user = req.user;
        const {
            firstName,
            lastName,
            dateOfBirth,
            phone,
            street,
            city,
            postalCode,
            country,
            iban,
            bic,
            bankName,
            accountHolderName,
        } = req.body;

        // Validate required fields for profile completion
        const errors = [];
        if (!firstName?.trim()) errors.push('First name is required');
        if (!lastName?.trim()) errors.push('Last name is required');
        if (!dateOfBirth) errors.push('Date of birth is required');
        if (!phone?.trim()) errors.push('Phone number is required');
        if (!street?.trim()) errors.push('Street address is required');
        if (!city?.trim()) errors.push('City is required');
        if (!postalCode?.trim()) errors.push('Postal code is required');
        if (!iban?.trim()) errors.push('IBAN is required');

        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        // Validate IBAN format (basic check)
        const cleanIban = iban.replace(/\s/g, '').toUpperCase();
        if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/.test(cleanIban)) {
            return res.status(400).json({ success: false, error: 'Invalid IBAN format' });
        }

        // Update user profile
        await user.update({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            dateOfBirth,
            phone: phone.trim(),
            street: street.trim(),
            city: city.trim(),
            postalCode: postalCode.trim(),
            country: country?.trim() || 'Luxembourg',
            iban: cleanIban,
            bic: bic?.trim().toUpperCase() || null,
            bankName: bankName?.trim() || null,
            accountHolderName: accountHolderName?.trim() || `${firstName.trim()} ${lastName.trim()}`,
            profileComplete: true,
        });

        logger.info(`Profile completed for user ${user.email}`);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            profile: {
                firstName: user.firstName,
                lastName: user.lastName,
                profileComplete: true,
            },
        });
    } catch (err) {
        logger.error('Update profile error:', err);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
};

// Request password reset
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        // Always return success to prevent email enumeration
        const successResponse = {
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.',
        };

        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Don't reveal that user doesn't exist
            return res.json(successResponse);
        }

        // Invalidate any existing password reset tokens for this user
        await OTP.update(
            { used: true },
            { where: { userId: user.id, type: OTP_TYPES.PASSWORD_RESET, used: false } }
        );

        // Create new password reset token
        const resetOTP = await OTP.create({
            userId: user.id,
            type: OTP_TYPES.PASSWORD_RESET,
        });

        // Get user's display name
        const userName = user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : user.organizationName || user.email;

        // Send password reset email
        emailClient.sendPasswordReset({
            to: user.email,
            userName,
            resetToken: resetOTP.token,
        }).catch(err => logger.error('Failed to send password reset email:', err));

        logger.info(`Password reset requested for ${user.email}`);

        res.json(successResponse);
    } catch (err) {
        logger.error('Forgot password error:', err);
        res.status(500).json({ success: false, error: 'Failed to process request' });
    }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ success: false, error: 'Token and new password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
        }

        const resetOTP = await OTP.findOne({
            where: {
                token,
                type: OTP_TYPES.PASSWORD_RESET,
                used: false,
            },
            include: [User],
        });

        if (!resetOTP) {
            return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
        }

        if (new Date() > resetOTP.expiresAt) {
            return res.status(400).json({ success: false, error: 'Reset token has expired' });
        }

        const user = resetOTP.User;

        // Update password
        user.password = password;
        await user.save();

        // Mark token as used
        await resetOTP.update({ used: true, usedAt: new Date() });

        // Invalidate all sessions for this user (force re-login)
        await Session.update(
            { revoked: true },
            { where: { userId: user.id } }
        );

        logger.info(`Password reset completed for ${user.email}`);

        res.json({
            success: true,
            message: 'Password has been reset successfully. You can now log in with your new password.',
        });
    } catch (err) {
        logger.error('Reset password error:', err);
        res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
};