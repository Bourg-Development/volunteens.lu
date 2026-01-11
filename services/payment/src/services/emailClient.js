const servicesConfig = require('../config/services');
const logger = require('../utils/logger');
const { generateInvoicePDF } = require('./invoiceService');

const EMAIL_URL = servicesConfig.emailInternal;
const EMAIL_SECRET = servicesConfig.emailServiceSecret;

async function sendEmail(type, to, data, attachments = []) {
    try {
        const response = await fetch(`${EMAIL_URL}/api/v1/internal/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-email-secret': EMAIL_SECRET,
            },
            body: JSON.stringify({ type, to, data, attachments }),
        });

        const result = await response.json();
        if (!result.success) {
            logger.error('Email service error:', result.error);
            return false;
        }
        logger.info(`Email sent: ${type} to ${to}`);
        return true;
    } catch (err) {
        logger.error('Failed to send email:', err.message);
        return false;
    }
}

async function sendInvoiceNotification(invoice) {
    // Convert Sequelize model to plain object if needed
    const invoiceData = invoice.toJSON ? invoice.toJSON() : invoice;

    const data = {
        invoiceNumber: invoiceData.invoiceNumber,
        studentName: invoiceData.studentName || 'Volunteer',
        studentEmail: invoiceData.studentEmail,
        organizationName: invoiceData.organizationName,
        eventTitle: invoiceData.eventTitle,
        eventDate: invoiceData.eventDate ? new Date(invoiceData.eventDate).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : 'N/A',
        hours: invoiceData.hours,
        hourlyRate: invoiceData.hourlyRate,
        amount: invoiceData.amount,
        currency: invoiceData.currency,
    };

    // Generate PDF invoice
    let attachments = [];
    try {
        logger.info(`Generating PDF for invoice ${invoiceData.invoiceNumber}...`);
        const pdfBuffer = await generateInvoicePDF(invoiceData);
        if (pdfBuffer && pdfBuffer.length > 0) {
            attachments = [{
                filename: `${invoiceData.invoiceNumber}.pdf`,
                content: pdfBuffer.toString('base64'),
                contentType: 'application/pdf',
            }];
            logger.info(`PDF generated for invoice ${invoiceData.invoiceNumber} (${pdfBuffer.length} bytes)`);
        } else {
            logger.error(`PDF buffer is empty for invoice ${invoiceData.invoiceNumber}`);
        }
    } catch (err) {
        logger.error(`Failed to generate PDF for invoice ${invoiceData.invoiceNumber}:`, err);
        // Continue sending email without attachment
    }

    return sendEmail('invoiceNotification', invoiceData.organizationEmail, data, attachments);
}

module.exports = {
    sendEmail,
    sendInvoiceNotification,
};
