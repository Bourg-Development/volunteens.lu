const servicesConfig = require('../config/services');
const logger = require('../utils/logger');

const PAYMENT_URL = servicesConfig.paymentInternal;
const PAYMENT_SECRET = servicesConfig.paymentServiceSecret;

async function createInvoice(invoiceData) {
    try {
        const response = await fetch(`${PAYMENT_URL}/api/v1/invoices/internal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-payment-secret': PAYMENT_SECRET,
            },
            body: JSON.stringify(invoiceData),
        });

        const result = await response.json();
        if (!result.success) {
            logger.error('Payment service error:', result.error);
            return null;
        }
        logger.info(`Invoice created: ${result.invoice.invoiceNumber}`);
        return result.invoice;
    } catch (err) {
        logger.error('Failed to create invoice:', err.message);
        return null;
    }
}

module.exports = {
    createInvoice,
};
