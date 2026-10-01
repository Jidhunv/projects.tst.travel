"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const EmailSettings_1 = require("../models/EmailSettings");
const email_1 = require("../config/email");
const handlebars_1 = __importDefault(require("handlebars"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../utils/logger"));
class EmailService {
    constructor() {
        this.emailSettingsRepository = database_1.AppDataSource.getRepository(EmailSettings_1.EmailSettings);
        this.templatesDir = path_1.default.join(process.cwd(), 'src', 'templates');
        this.cache = new Map();
    }
    async getEmailConfig() {
        try {
            return await this.emailSettingsRepository.findOne({
                where: {},
                relations: ['updatedBy'],
            });
        }
        catch (error) {
            logger_1.default.error('Failed to get email config:', error);
            return null;
        }
    }
    async sendEmail(to, subject, templateName, variables = {}) {
        try {
            const config = await this.getEmailConfig();
            if (!config || !config.isConfigured) {
                logger_1.default.warn(`Email not configured. Skipping email to ${to}`);
                return;
            }
            if (!process.env.ENABLE_EMAIL_NOTIFICATIONS || process.env.ENABLE_EMAIL_NOTIFICATIONS === 'false') {
                logger_1.default.info(`Email notifications disabled. Skipping email to ${to}`);
                return;
            }
            let transporter = (0, email_1.getEmailTransport)();
            if (!transporter) {
                transporter = await (0, email_1.initializeEmailTransport)(config);
            }
            const htmlContent = await this.renderTemplate(templateName, variables);
            await transporter.sendMail({
                from: `${config.fromName} <${config.fromEmail}>`,
                to,
                subject,
                html: htmlContent,
            });
            logger_1.default.info(`Email sent successfully to ${to} (template: ${templateName})`);
        }
        catch (error) {
            logger_1.default.error(`Failed to send email to ${to}:`, error);
        }
    }
    async renderTemplate(templateName, variables) {
        try {
            const templatePath = path_1.default.join(this.templatesDir, `${templateName}.hbs`);
            if (!this.cache.has(templateName)) {
                if (!fs_1.default.existsSync(templatePath)) {
                    throw new Error(`Template not found: ${templateName}`);
                }
                const content = fs_1.default.readFileSync(templatePath, 'utf-8');
                this.cache.set(templateName, content);
            }
            const template = handlebars_1.default.compile(this.cache.get(templateName));
            return template(variables);
        }
        catch (error) {
            logger_1.default.error(`Failed to render template ${templateName}:`, error);
            throw error;
        }
    }
    async sendPasswordResetEmail(user, resetToken) {
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        await this.sendEmail(user.email, 'Reset Your Password', 'password-reset', {
            userName: `${user.firstName} ${user.lastName}`,
            resetLink,
            expiryHours: 24,
        });
    }
    async sendTemporaryPasswordEmail(user, tempPassword, invitedBy) {
        await this.sendEmail(user.email, 'Your Temporary Password', 'temporary-password', {
            userName: `${user.firstName} ${user.lastName}`,
            tempPassword,
            invitedByName: invitedBy ? `${invitedBy.firstName} ${invitedBy.lastName}` : 'Administrator',
            loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
        });
    }
    async sendLeadAssignmentEmail(lead, assignedUser) {
        await this.sendEmail(assignedUser.email, `New Lead Assigned: ${lead.companyName}`, 'lead-assigned', {
            userName: `${assignedUser.firstName} ${assignedUser.lastName}`,
            leadName: lead.firstName,
            leadCompany: lead.companyName,
            leadEmail: lead.email,
            leadPhone: lead.phoneNumber,
            dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/leads/${lead.id}`,
        });
    }
    async sendOpportunityUpdateEmail(opportunity, assignedUser, changeType, oldStage) {
        await this.sendEmail(assignedUser.email, `Opportunity Update: ${opportunity.opportunityName}`, 'opportunity-update', {
            userName: `${assignedUser.firstName} ${assignedUser.lastName}`,
            opportunityName: opportunity.opportunityName,
            accountName: opportunity.account?.accountName,
            amount: opportunity.amount,
            newStage: opportunity.stage,
            oldStage: oldStage || 'N/A',
            changeType,
            dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/opportunities/${opportunity.id}`,
        });
    }
    async sendTicketAssignmentEmail(ticket, assignedUser) {
        await this.sendEmail(assignedUser.email, `New Ticket Assigned: ${ticket.ticketNumber}`, 'ticket-assigned', {
            userName: `${assignedUser.firstName} ${assignedUser.lastName}`,
            ticketNumber: ticket.ticketNumber,
            ticketTitle: ticket.title,
            ticketDescription: ticket.description,
            priority: ticket.priority,
            dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticket.id}`,
        });
    }
    async sendContractApprovalEmail(contract, approver) {
        await this.sendEmail(approver.email, `Contract Awaiting Approval: ${contract.contractName}`, 'contract-approval', {
            userName: `${approver.firstName} ${approver.lastName}`,
            contractName: contract.contractName,
            vendor: contract.vendorName,
            amount: contract.amount,
            dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/contracts/${contract.id}`,
        });
    }
    async sendUserCreatedEmail(user, tempPassword, invitedBy) {
        await this.sendEmail(user.email, 'Welcome to CRM System', 'user-created', {
            userName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            tempPassword,
            invitedByName: `${invitedBy.firstName} ${invitedBy.lastName}`,
            loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
        });
    }
    async sendUserRoleChangeEmail(user, newRole, changedBy) {
        await this.sendEmail(user.email, 'Your Role Has Been Updated', 'user-role-changed', {
            userName: `${user.firstName} ${user.lastName}`,
            newRole,
            changedByName: `${changedBy.firstName} ${changedBy.lastName}`,
            dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
        });
    }
}
exports.default = new EmailService();
//# sourceMappingURL=email.service.js.map