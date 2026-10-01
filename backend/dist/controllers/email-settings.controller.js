"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSettingsController = void 0;
const database_1 = require("../config/database");
const EmailSettings_1 = require("../models/EmailSettings");
const errorHandler_1 = require("../middleware/errorHandler");
const email_1 = require("../config/email");
const email_service_1 = __importDefault(require("../services/email.service"));
const logger_1 = __importDefault(require("../utils/logger"));
class EmailSettingsController {
    constructor() {
        this.emailSettingsRepository = database_1.AppDataSource.getRepository(EmailSettings_1.EmailSettings);
    }
    async getSettings(req, res, next) {
        try {
            let settings = await this.emailSettingsRepository.findOne({
                where: {},
                relations: ['updatedBy'],
            });
            if (!settings) {
                settings = this.emailSettingsRepository.create({
                    smtpHost: '',
                    smtpPort: 587,
                    smtpUser: '',
                    smtpPassword: '',
                    fromEmail: '',
                    fromName: '',
                    isConfigured: false,
                    enableNotifications: true,
                });
                await this.emailSettingsRepository.save(settings);
            }
            const maskedSettings = {
                ...settings,
                smtpPassword: (0, email_1.maskPassword)(settings.smtpPassword),
            };
            return res.json({ success: true, data: maskedSettings });
        }
        catch (error) {
            next(error);
        }
    }
    async updateSettings(req, res, next) {
        try {
            const { smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, fromName, enableNotifications } = req.body;
            if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !fromEmail || !fromName) {
                throw new errorHandler_1.AppError(400, 'All SMTP fields are required');
            }
            let settings = await this.emailSettingsRepository.findOne({
                where: {},
            });
            if (!settings) {
                settings = this.emailSettingsRepository.create();
            }
            settings.smtpHost = smtpHost;
            settings.smtpPort = smtpPort;
            settings.smtpUser = smtpUser;
            settings.smtpPassword = smtpPassword;
            settings.fromEmail = fromEmail;
            settings.fromName = fromName;
            settings.enableNotifications = enableNotifications !== false;
            settings.updatedBy = req.user;
            await this.emailSettingsRepository.save(settings);
            logger_1.default.info(`Email settings updated by ${req.user?.email}`);
            const maskedSettings = {
                ...settings,
                smtpPassword: (0, email_1.maskPassword)(settings.smtpPassword),
            };
            return res.json({ success: true, data: maskedSettings });
        }
        catch (error) {
            next(error);
        }
    }
    async testConnection(req, res, next) {
        try {
            const settings = await this.emailSettingsRepository.findOne({
                where: {},
            });
            if (!settings || !settings.isConfigured) {
                throw new errorHandler_1.AppError(400, 'Email settings not configured');
            }
            await (0, email_1.testEmailConnection)({
                smtpHost: settings.smtpHost,
                smtpPort: settings.smtpPort,
                smtpUser: settings.smtpUser,
                smtpPassword: settings.smtpPassword,
                fromEmail: settings.fromEmail,
                fromName: settings.fromName,
            });
            logger_1.default.info(`Email connection tested successfully by ${req.user?.email}`);
            return res.json({
                success: true,
                data: {
                    message: 'Email connection successful',
                    host: settings.smtpHost,
                    port: settings.smtpPort,
                    user: settings.smtpUser,
                },
            });
        }
        catch (error) {
            logger_1.default.error('Email connection test failed:', error);
            next(error);
        }
    }
    async sendTestEmail(req, res, next) {
        try {
            const settings = await this.emailSettingsRepository.findOne({
                where: {},
            });
            if (!settings || !settings.isConfigured) {
                throw new errorHandler_1.AppError(400, 'Email settings not configured');
            }
            const testEmail = req.user?.email;
            if (!testEmail) {
                throw new errorHandler_1.AppError(400, 'User email not found');
            }
            await email_service_1.default.sendEmail(testEmail, 'CRM Email Configuration Test', 'test-email', {
                userName: req.user?.email || 'User',
                timestamp: new Date().toISOString(),
            });
            logger_1.default.info(`Test email sent to ${testEmail} by ${req.user?.email}`);
            return res.json({
                success: true,
                data: {
                    message: 'Test email sent successfully',
                    sentTo: testEmail,
                },
            });
        }
        catch (error) {
            logger_1.default.error('Failed to send test email:', error);
            next(error);
        }
    }
}
exports.EmailSettingsController = EmailSettingsController;
exports.default = new EmailSettingsController();
//# sourceMappingURL=email-settings.controller.js.map