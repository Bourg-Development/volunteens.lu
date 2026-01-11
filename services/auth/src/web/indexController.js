const services = require('../config/services');

module.exports = {
    login: (req, res, next) => {
        res.render('pages/login.ejs', {
            title: 'Sign In',
            success: req.query['success'] === '1',
            msg: req.query['msg'],
        });
    },
    register: (req, res, next) => {
        res.render('pages/register.ejs', {
            title: 'Create Account',
            webUiUrl: services.webUi,
        });
    },
    forgotPassword: (req, res, next) => {
        res.render('pages/forgot-password.ejs', {
            title: 'Forgot Password',
        });
    },
    resetPassword: (req, res, next) => {
        const token = req.query.token || '';
        if (!token) {
            return res.redirect('/forgot-password');
        }
        res.render('pages/reset-password.ejs', {
            title: 'Reset Password',
            token,
        });
    },
    index: (req, res, next) => {
        res.status(200).redirect('/login')
    }
}