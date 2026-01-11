const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const INVOICE_STATUSES = {
    PENDING: 'pending',
    PAID: 'paid',
    CANCELLED: 'cancelled',
};

const Invoice = sequelize.define('Invoice', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    // Student is the issuer (service provider)
    studentId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    studentEmail: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    studentName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    studentPhone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // Student address
    studentStreet: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    studentCity: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    studentPostalCode: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    studentCountry: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // Student bank details
    studentIban: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    studentBic: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    studentBankName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    studentAccountHolderName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // Organization is the recipient (payer)
    organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    organizationEmail: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    organizationName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // Event reference
    eventId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    eventTitle: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    signupId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
    },
    // Financial details
    hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
    },
    hourlyRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'EUR',
    },
    // Status tracking
    status: {
        type: DataTypes.ENUM(Object.values(INVOICE_STATUSES)),
        allowNull: false,
        defaultValue: INVOICE_STATUSES.PENDING,
    },
    // Shift details (JSON array of attended shifts)
    attendedShifts: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const value = this.getDataValue('attendedShifts');
            return value ? JSON.parse(value) : [];
        },
        set(value) {
            this.setDataValue('attendedShifts', value ? JSON.stringify(value) : null);
        },
    },
    // Dates
    eventDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    eventEndDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'invoices',
    timestamps: true,
    indexes: [
        { fields: ['studentId'] },
        { fields: ['organizationId'] },
        { fields: ['eventId'] },
        { fields: ['status'] },
    ],
});

module.exports = { Invoice, INVOICE_STATUSES };
