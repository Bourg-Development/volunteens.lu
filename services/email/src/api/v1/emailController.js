const path = require('path');
const fs = require('fs');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');

const templatesDir = path.join(__dirname, '../../templates');

module.exports = {
    send: async (req, res) => {
        try {
            const { type, to, subject, data, attachments } = req.body;

            logger.info(`Email request: type=${type}, to=${to}, attachments=${attachments ? attachments.length : 0}`);

            if (!type || !to) {
                return res.status(400).json({ success: false, error: 'Missing required fields: type, to' });
            }

            // Check if template exists for this type
            const templatePath = path.join(templatesDir, `${type}.ejs`);

            if (!fs.existsSync(templatePath)) {
                return res.status(400).json({ success: false, error: `No template found for type: ${type}` });
            }

            // Subject can be provided or use a default
            const emailSubject = subject || data?.subject || `Volunteens - ${type}`;

            const result = await emailService.sendEmail({
                to,
                subject: emailSubject,
                template: type,
                data: data || {},
                attachments: attachments || [],
            });

            res.json({ success: true, messageId: result.messageId });
        } catch (err) {
            logger.error('Error in email controller:', err);
            res.status(500).json({ success: false, error: 'Failed to send email' });
        }
    },
};