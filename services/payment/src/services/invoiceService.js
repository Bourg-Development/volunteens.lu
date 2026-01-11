const { Invoice } = require('../database');
const PDFDocument = require('pdfkit');

async function generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Find the highest invoice number for this year
    const lastInvoice = await Invoice.findOne({
        where: {
            invoiceNumber: {
                [require('sequelize').Op.like]: `${prefix}%`,
            },
        },
        order: [['invoiceNumber', 'DESC']],
    });

    let nextNumber = 1;
    if (lastInvoice) {
        const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10);
        nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

function calculateHours(eventDate, eventEndDate) {
    if (!eventDate || !eventEndDate) {
        // Default to 2 hours if no end date
        return 2;
    }

    const start = new Date(eventDate);
    const end = new Date(eventEndDate);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);

    // Round to 2 decimal places, minimum 0.5 hours
    return Math.max(0.5, Math.round(diffHours * 100) / 100);
}

function calculateAmount(hours, hourlyRate) {
    return Math.round(hours * hourlyRate * 100) / 100;
}

/**
 * Generate a PDF invoice and return it as a Buffer
 * Ensures sections don't break across pages
 */
function generateInvoicePDF(invoice) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const pageHeight = 792; // Letter size height in points
            const bottomMargin = 50;
            const usableBottom = pageHeight - bottomMargin;

            // Helper: check if we need a new page for a section of given height
            const ensureSpace = (neededHeight) => {
                if (doc.y + neededHeight > usableBottom) {
                    doc.addPage();
                }
            };

            // Safely format values
            const hours = typeof invoice.hours === 'number' ? invoice.hours : parseFloat(invoice.hours) || 0;
            const hourlyRate = typeof invoice.hourlyRate === 'number' ? invoice.hourlyRate : parseFloat(invoice.hourlyRate) || 0;
            const amount = typeof invoice.amount === 'number' ? invoice.amount : parseFloat(invoice.amount) || 0;
            const createdDate = invoice.createdAt ? new Date(invoice.createdAt) : new Date();
            const attendedShifts = invoice.attendedShifts || [];

            // ===== HEADER SECTION =====
            doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
            doc.moveDown(0.5);
            doc.fontSize(12).font('Helvetica').text(`Invoice #: ${invoice.invoiceNumber || 'N/A'}`, { align: 'right' });
            doc.text(`Date: ${createdDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'right' });
            doc.moveDown(1.5);

            // ===== FROM/TO SECTION (side by side) =====
            const addressSectionTop = doc.y;

            // FROM section (left side)
            doc.fontSize(10).font('Helvetica-Bold').text('FROM:', 50, addressSectionTop);
            doc.font('Helvetica');
            let fromY = addressSectionTop + 15;
            doc.text(invoice.studentName || 'Volunteer', 50, fromY);
            fromY += 12;
            if (invoice.studentStreet) {
                doc.text(invoice.studentStreet, 50, fromY);
                fromY += 12;
            }
            if (invoice.studentPostalCode || invoice.studentCity) {
                doc.text([invoice.studentPostalCode, invoice.studentCity].filter(Boolean).join(' '), 50, fromY);
                fromY += 12;
            }
            if (invoice.studentCountry) {
                doc.text(invoice.studentCountry, 50, fromY);
                fromY += 12;
            }
            doc.text(invoice.studentEmail, 50, fromY);
            fromY += 12;
            if (invoice.studentPhone) {
                doc.text(invoice.studentPhone, 50, fromY);
                fromY += 12;
            }

            // TO section (right side)
            doc.font('Helvetica-Bold').text('TO:', 320, addressSectionTop);
            doc.font('Helvetica');
            let toY = addressSectionTop + 15;
            doc.text(invoice.organizationName || 'Organization', 320, toY);
            toY += 12;
            doc.text(invoice.organizationEmail, 320, toY);
            toY += 12;

            // Move to after address sections
            doc.y = Math.max(fromY, toY) + 20;
            doc.x = 50;

            // ===== EVENT DETAILS SECTION =====
            ensureSpace(60);
            doc.font('Helvetica-Bold').text('EVENT DETAILS:');
            doc.font('Helvetica');
            doc.text(`Event: ${invoice.eventTitle || 'Event'}`);
            if (invoice.eventDate) {
                const startDate = new Date(invoice.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                if (invoice.eventEndDate && invoice.eventEndDate !== invoice.eventDate) {
                    const endDate = new Date(invoice.eventEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                    doc.text(`Period: ${startDate} - ${endDate}`);
                } else {
                    doc.text(`Date: ${startDate}`);
                }
            }
            doc.moveDown(1.5);

            // ===== LINE ITEMS TABLE =====
            ensureSpace(100); // Table needs about 100 points
            const tableTop = doc.y;
            const col1 = 50;
            const col2 = 300;
            const col3 = 380;
            const col4 = 460;

            // Table header
            doc.font('Helvetica-Bold');
            doc.rect(col1, tableTop, 500, 25).fill('#f0f0f0');
            doc.fillColor('#000');
            doc.text('Description', col1 + 10, tableTop + 8);
            doc.text('Hours', col2 + 10, tableTop + 8);
            doc.text('Rate', col3 + 10, tableTop + 8);
            doc.text('Amount', col4 + 10, tableTop + 8);

            // Table row
            const rowY = tableTop + 25;
            doc.font('Helvetica');
            doc.text(`Volunteer work - ${invoice.eventTitle || 'Event'}`, col1 + 10, rowY + 8, { width: 240 });
            doc.text(`${hours.toFixed(2)}`, col2 + 10, rowY + 8);
            doc.text(`€${hourlyRate.toFixed(2)}`, col3 + 10, rowY + 8);
            doc.text(`€${amount.toFixed(2)}`, col4 + 10, rowY + 8);

            // Table borders
            doc.rect(col1, tableTop, 500, 50).stroke();
            doc.moveTo(col2, tableTop).lineTo(col2, tableTop + 50).stroke();
            doc.moveTo(col3, tableTop).lineTo(col3, tableTop + 50).stroke();
            doc.moveTo(col4, tableTop).lineTo(col4, tableTop + 50).stroke();
            doc.moveTo(col1, tableTop + 25).lineTo(col1 + 500, tableTop + 25).stroke();

            // Total
            doc.y = tableTop + 60;
            doc.x = 50;
            doc.font('Helvetica-Bold').fontSize(14);
            doc.text(`TOTAL: €${amount.toFixed(2)}`, { align: 'right' });
            doc.moveDown(2);

            // ===== SHIFT DETAILS SECTION =====
            if (attendedShifts.length > 0) {
                // Calculate height needed for shift details
                const shiftSectionHeight = 20 + (attendedShifts.length * 14) + 20;
                ensureSpace(shiftSectionHeight);

                doc.fontSize(10).font('Helvetica-Bold').text('SHIFT DETAILS:');
                doc.font('Helvetica');
                attendedShifts.forEach(shift => {
                    const shiftDate = new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                    const shiftHours = typeof shift.hours === 'number' ? shift.hours : parseFloat(shift.hours) || 0;
                    const startTime = shift.startTime ? shift.startTime.substring(0, 5) : '00:00';
                    const endTime = shift.endTime ? shift.endTime.substring(0, 5) : '00:00';
                    doc.text(`• ${shiftDate}: ${startTime} - ${endTime} (${shiftHours.toFixed(1)}h)`);
                });
                doc.moveDown(1.5);
            }

            // ===== PAYMENT/BANK DETAILS SECTION =====
            // Calculate height needed for bank details section
            let bankSectionHeight = 80; // Base height for header and reference
            if (invoice.studentIban) {
                bankSectionHeight += 60; // IBAN, holder, etc.
                if (invoice.studentBic) bankSectionHeight += 15;
                if (invoice.studentBankName) bankSectionHeight += 15;
            }
            ensureSpace(bankSectionHeight);

            doc.fontSize(10).font('Helvetica-Bold').text('PAYMENT INFORMATION:');
            doc.font('Helvetica');
            doc.text('Please transfer the amount to the following bank account:');
            doc.moveDown(0.5);

            if (invoice.studentIban) {
                const bankDetailsTop = doc.y;
                const labelWidth = 120;

                doc.font('Helvetica-Bold').text('Account Holder:', 50, bankDetailsTop);
                doc.font('Helvetica').text(invoice.studentAccountHolderName || invoice.studentName || 'N/A', 50 + labelWidth, bankDetailsTop);

                doc.font('Helvetica-Bold').text('IBAN:', 50, bankDetailsTop + 15);
                doc.font('Helvetica').text(invoice.studentIban, 50 + labelWidth, bankDetailsTop + 15);

                let nextY = bankDetailsTop + 30;
                if (invoice.studentBic) {
                    doc.font('Helvetica-Bold').text('BIC/SWIFT:', 50, nextY);
                    doc.font('Helvetica').text(invoice.studentBic, 50 + labelWidth, nextY);
                    nextY += 15;
                }

                if (invoice.studentBankName) {
                    doc.font('Helvetica-Bold').text('Bank:', 50, nextY);
                    doc.font('Helvetica').text(invoice.studentBankName, 50 + labelWidth, nextY);
                    nextY += 15;
                }

                doc.y = nextY + 10;
            } else {
                doc.text('Bank details not provided. Please contact the volunteer.');
                doc.moveDown(1);
            }

            doc.x = 50;
            doc.font('Helvetica-Bold').text('Reference:', { continued: true });
            doc.font('Helvetica').text('  ' + (invoice.invoiceNumber || 'N/A'));

            // ===== FOOTER =====
            // Footer always at bottom of current page
            doc.moveDown(2);
            doc.fontSize(8).fillColor('#666');
            doc.text('This invoice was generated automatically by Volunteens.', 50, usableBottom - 30, { align: 'center', width: 500 });
            doc.text('For questions, please contact support@volunteens.lu', 50, usableBottom - 18, { align: 'center', width: 500 });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateInvoiceNumber,
    calculateHours,
    calculateAmount,
    generateInvoicePDF,
};
