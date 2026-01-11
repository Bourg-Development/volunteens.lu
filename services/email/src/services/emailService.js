const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    } : undefined,
});

const templatesDir = path.join(__dirname, '../templates');

async function renderTemplate(templateName, data) {
    const templatePath = path.join(templatesDir, `${templateName}.ejs`);
    return ejs.renderFile(templatePath, data);
}

async function sendEmail({ to, subject, template, data, attachments }) {
    const html = await renderTemplate(template, data);

    const mailOptions = {
        from: process.env.SMTP_FROM || '"Volunteens" <noreply@volunteens.lu>',
        to,
        subject,
        html,
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map(att => ({
            filename: att.filename,
            content: Buffer.from(att.content, 'base64'),
            contentType: att.contentType || 'application/octet-stream',
        }));
    }

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId} to ${to}`);
    return { success: true, messageId: info.messageId };
}

module.exports = {
    sendEmail,
};
