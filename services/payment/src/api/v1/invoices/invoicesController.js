const { Invoice, INVOICE_STATUSES } = require('../../../database');
const { getUserProfile } = require('../../../services/authClient');
const { sendInvoiceNotification } = require('../../../services/emailClient');
const { generateInvoiceNumber, calculateHours, calculateAmount } = require('../../../services/invoiceService');
const logger = require('../../../utils/logger');

// List student's invoices
exports.listMyInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.findAll({
            where: { studentId: req.user.id },
            order: [['createdAt', 'DESC']],
        });

        res.json({
            success: true,
            invoices,
        });
    } catch (err) {
        logger.error('Error listing invoices:', err);
        res.status(500).json({ success: false, error: 'Failed to list invoices' });
    }
};

// Get invoice details
exports.getInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const invoice = await Invoice.findByPk(invoiceId);

        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }

        // Check if user is the student or organization associated with this invoice
        if (invoice.studentId !== req.user.id && invoice.organizationId !== req.user.id) {
            // Allow admins to view any invoice
            if (!['admin', 'super_admin'].includes(req.user.role)) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
        }

        res.json({
            success: true,
            invoice,
        });
    } catch (err) {
        logger.error('Error getting invoice:', err);
        res.status(500).json({ success: false, error: 'Failed to get invoice' });
    }
};

// Student marks invoice as paid (payment received)
exports.markAsPaid = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const invoice = await Invoice.findByPk(invoiceId);

        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }

        // Only the student can mark their invoice as paid
        if (invoice.studentId !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Only the invoice issuer can mark it as paid' });
        }

        if (invoice.status === INVOICE_STATUSES.PAID) {
            return res.status(400).json({ success: false, error: 'Invoice is already marked as paid' });
        }

        if (invoice.status === INVOICE_STATUSES.CANCELLED) {
            return res.status(400).json({ success: false, error: 'Cannot mark a cancelled invoice as paid' });
        }

        invoice.status = INVOICE_STATUSES.PAID;
        invoice.paidAt = new Date();
        await invoice.save();

        logger.info(`Invoice ${invoice.invoiceNumber} marked as paid by ${req.user.email}`);

        res.json({
            success: true,
            invoice,
        });
    } catch (err) {
        logger.error('Error marking invoice as paid:', err);
        res.status(500).json({ success: false, error: 'Failed to update invoice' });
    }
};

// Internal: Create invoice (called by events service after attendance is marked)
exports.createInvoice = async (req, res) => {
    try {
        const {
            studentId,
            studentEmail,
            studentName,
            organizationId,
            organizationEmail,
            organizationName,
            eventId,
            eventTitle,
            signupId,
            hourlyRate,
            totalHours,
            attendedShifts,
        } = req.body;

        // Validate required fields
        if (!studentId || !studentEmail || !organizationId || !organizationEmail || !eventId || !eventTitle || !signupId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
        }

        // Validate that we have hours to invoice
        if (!totalHours || totalHours <= 0) {
            return res.status(400).json({
                success: false,
                error: 'No attended hours to invoice',
            });
        }

        // Check for duplicate (same signupId)
        const existing = await Invoice.findOne({ where: { signupId } });
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Invoice already exists for this signup',
                invoice: existing,
            });
        }

        // Calculate amount from total hours
        const amount = calculateAmount(totalHours, hourlyRate);

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber();

        // Fetch student's full profile (address, bank details)
        const studentProfile = await getUserProfile(studentId);
        if (!studentProfile) {
            logger.warn(`Could not fetch profile for student ${studentId}, using basic info`);
        }

        // Get first and last shift dates for display
        const sortedShifts = (attendedShifts || []).sort((a, b) => a.date.localeCompare(b.date));
        const firstShiftDate = sortedShifts[0]?.date || null;
        const lastShiftDate = sortedShifts[sortedShifts.length - 1]?.date || null;

        // Create invoice with full student details
        const invoice = await Invoice.create({
            invoiceNumber,
            studentId,
            studentEmail: studentProfile?.email || studentEmail,
            studentName: studentProfile?.name || studentName,
            studentPhone: studentProfile?.phone || null,
            // Student address
            studentStreet: studentProfile?.street || null,
            studentCity: studentProfile?.city || null,
            studentPostalCode: studentProfile?.postalCode || null,
            studentCountry: studentProfile?.country || null,
            // Student bank details
            studentIban: studentProfile?.iban || null,
            studentBic: studentProfile?.bic || null,
            studentBankName: studentProfile?.bankName || null,
            studentAccountHolderName: studentProfile?.accountHolderName || studentProfile?.name || studentName,
            // Organization
            organizationId,
            organizationEmail,
            organizationName,
            // Event
            eventId,
            eventTitle,
            signupId,
            // Financial
            hours: totalHours,
            hourlyRate,
            amount,
            currency: 'EUR',
            status: INVOICE_STATUSES.PENDING,
            eventDate: firstShiftDate,
            eventEndDate: lastShiftDate,
            attendedShifts: attendedShifts || [],
            sentAt: new Date(),
        });

        logger.info(`Invoice created: ${invoiceNumber} for ${studentEmail} - ${eventTitle} (${totalHours}h)`);

        // Send email notification to organization
        const emailSent = await sendInvoiceNotification(invoice);
        if (!emailSent) {
            logger.warn(`Failed to send invoice email for ${invoiceNumber}`);
        }

        res.status(201).json({
            success: true,
            invoice,
        });
    } catch (err) {
        logger.error('Error creating invoice:', err);
        res.status(500).json({ success: false, error: 'Failed to create invoice' });
    }
};

// Internal: List invoices by organization
exports.listByOrganization = async (req, res) => {
    try {
        const { orgId } = req.params;

        const invoices = await Invoice.findAll({
            where: { organizationId: orgId },
            order: [['createdAt', 'DESC']],
        });

        res.json({
            success: true,
            invoices,
        });
    } catch (err) {
        logger.error('Error listing organization invoices:', err);
        res.status(500).json({ success: false, error: 'Failed to list invoices' });
    }
};
