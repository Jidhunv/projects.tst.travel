"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeEmailTransport = initializeEmailTransport;
exports.getEmailTransport = getEmailTransport;
exports.testEmailConnection = testEmailConnection;
exports.maskPassword = maskPassword;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = __importDefault(require("../utils/logger"));
let transporter = null;
async function initializeEmailTransport(config) {
    try {
        transporter = nodemailer_1.default.createTransport({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpPort === 465,
            auth: {
                user: config.smtpUser,
                pass: config.smtpPassword,
            },
        });
        await transporter.verify();
        logger_1.default.info('Email transporter verified successfully');
        return transporter;
    }
    catch (error) {
        logger_1.default.error('Failed to initialize email transporter:', error);
        throw error;
    }
}
function getEmailTransport() {
    return transporter;
}
async function testEmailConnection(config) {
    try {
        const testTransport = nodemailer_1.default.createTransport({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpPort === 465,
            auth: {
                user: config.smtpUser,
                pass: config.smtpPassword,
            },
        });
        await testTransport.verify();
        logger_1.default.info('Email connection test successful');
    }
    catch (error) {
        logger_1.default.error('Email connection test failed:', error);
        throw error;
    }
}
function maskPassword(password) {
    if (password.length <= 4)
        return '****';
    return password.substring(0, 2) + '*'.repeat(password.length - 4) + password.substring(password.length - 2);
}
//# sourceMappingURL=email.js.map