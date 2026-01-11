const servicesConfig = require('../config/services');
const logger = require('../utils/logger');

const PAYMENT_API = `${servicesConfig.paymentInternal}/api/v1`;

async function fetchPayments(endpoint, token, options = {}) {
    const response = await fetch(`${PAYMENT_API}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    });
    return response.json();
}

// List student's invoices
exports.studentPayments = async (req, res) => {
    try {
        const data = await fetchPayments('/invoices/my', req.cookies.accessToken);
        res.render('pages/payments/student-payments', {
            title: 'My Payments',
            user: req.user,
            activeNav: 'payments',
            invoices: data.invoices || [],
            error: data.success ? null : data.error,
            success: req.query.success === '1',
            msg: req.query.msg,
        });
    } catch (err) {
        logger.error('Error fetching payments:', err);
        res.render('pages/payments/student-payments', {
            title: 'My Payments',
            user: req.user,
            activeNav: 'payments',
            invoices: [],
            error: 'Failed to load payments',
        });
    }
};

// Mark invoice as paid (received)
exports.markAsPaid = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const data = await fetchPayments(`/invoices/${invoiceId}/paid`, req.cookies.accessToken, {
            method: 'PUT',
        });

        if (data.success) {
            res.redirect('/payments?success=1&msg=' + encodeURIComponent('Payment marked as received'));
        } else {
            res.redirect('/payments?error=' + encodeURIComponent(data.error));
        }
    } catch (err) {
        logger.error('Error marking payment as received:', err);
        res.redirect('/payments?error=' + encodeURIComponent('Failed to update payment'));
    }
};
