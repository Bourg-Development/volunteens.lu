const logger = require('../utils/logger');

const AUTH_URL = process.env.AUTH_INTERNAL_URL || 'http://auth:3000';

module.exports = {
    home: (req, res, next) => {
        res.status(200).json({ msg: "success", user: req.user })
    },

    // Show profile completion page
    completeProfilePage: async (req, res) => {
        // If profile is already complete, redirect to home
        if (req.user.profileComplete) {
            return res.redirect('/');
        }

        // Fetch current profile data from auth service
        let profile = {};
        try {
            const response = await fetch(`${AUTH_URL}/api/v1/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${req.cookies.accessToken}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                profile = data.profile;
            }
        } catch (err) {
            logger.error('Error fetching profile:', err);
        }

        res.render('pages/complete-profile', {
            title: 'Complete Your Profile',
            layout: 'layouts/minimal',
            user: req.user,
            profile,
            error: req.query.error,
            errors: [],
        });
    },

    // Handle profile completion form submission
    completeProfile: async (req, res) => {
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

        try {
            const response = await fetch(`${AUTH_URL}/api/v1/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${req.cookies.accessToken}`,
                },
                body: JSON.stringify({
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
                }),
            });

            const data = await response.json();

            if (!data.success) {
                // Validation errors
                return res.render('pages/complete-profile', {
                    title: 'Complete Your Profile',
                    layout: 'layouts/minimal',
                    user: req.user,
                    profile: req.body,
                    error: data.error,
                    errors: data.errors || [],
                });
            }

            // Success - redirect to dashboard
            logger.info(`Profile completed for user ${req.user.email}`);
            res.redirect('/?welcome=1');

        } catch (err) {
            logger.error('Error updating profile:', err);
            res.render('pages/complete-profile', {
                title: 'Complete Your Profile',
                layout: 'layouts/minimal',
                user: req.user,
                profile: req.body,
                error: 'Failed to update profile. Please try again.',
                errors: [],
            });
        }
    },
};
