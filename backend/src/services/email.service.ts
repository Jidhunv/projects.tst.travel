import { AppDataSource } from '../config/database';
import { EmailSettings } from '../models/EmailSettings';
import { User } from '../models/User';
import { initializeEmailTransport, getEmailTransport } from '../config/email';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
}

class EmailService {
  private emailSettingsRepository = AppDataSource.getRepository(EmailSettings);
  private templatesDir = path.join(process.cwd(), 'src', 'templates');
  private cache: Map<string, string> = new Map();

  async getEmailConfig(): Promise<EmailSettings | null> {
    try {
      return await this.emailSettingsRepository.findOne({
        where: {},
        relations: ['updatedBy'],
      });
    } catch (error) {
      logger.error('Failed to get email config:', error);
      return null;
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    variables: Record<string, any> = {},
  ): Promise<void> {
    try {
      const config = await this.getEmailConfig();
      if (!config || !config.isConfigured) {
        logger.warn(`Email not configured. Skipping email to ${to}`);
        return;
      }

      if (!process.env.ENABLE_EMAIL_NOTIFICATIONS || process.env.ENABLE_EMAIL_NOTIFICATIONS === 'false') {
        logger.info(`Email notifications disabled. Skipping email to ${to}`);
        return;
      }

      let transporter = getEmailTransport();
      if (!transporter) {
        transporter = await initializeEmailTransport(config);
      }

      const htmlContent = await this.renderTemplate(templateName, variables);

      await transporter.sendMail({
        from: `${config.fromName} <${config.fromEmail}>`,
        to,
        subject,
        html: htmlContent,
      });

      logger.info(`Email sent successfully to ${to} (template: ${templateName})`);
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
    }
  }

  private async renderTemplate(templateName: string, variables: Record<string, any>): Promise<string> {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

      if (!this.cache.has(templateName)) {
        if (!fs.existsSync(templatePath)) {
          throw new Error(`Template not found: ${templateName}`);
        }
        const content = fs.readFileSync(templatePath, 'utf-8');
        this.cache.set(templateName, content);
      }

      const template = Handlebars.compile(this.cache.get(templateName)!);
      return template(variables);
    } catch (error) {
      logger.error(`Failed to render template ${templateName}:`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(user: User, resetToken: string): Promise<void> {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    await this.sendEmail(user.email, 'Reset Your Password', 'password-reset', {
      userName: `${user.firstName} ${user.lastName}`,
      resetLink,
      expiryHours: 24,
    });
  }

  async sendTemporaryPasswordEmail(user: User, tempPassword: string, invitedBy?: User): Promise<void> {
    await this.sendEmail(user.email, 'Your Temporary Password', 'temporary-password', {
      userName: `${user.firstName} ${user.lastName}`,
      tempPassword,
      invitedByName: invitedBy ? `${invitedBy.firstName} ${invitedBy.lastName}` : 'Administrator',
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
    });
  }

  async sendLeadAssignmentEmail(lead: any, assignedUser: User): Promise<void> {
    await this.sendEmail(assignedUser.email, `New Lead Assigned: ${lead.companyName}`, 'lead-assigned', {
      userName: `${assignedUser.firstName} ${assignedUser.lastName}`,
      leadName: lead.firstName,
      leadCompany: lead.companyName,
      leadEmail: lead.email,
      leadPhone: lead.phoneNumber,
      dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/leads/${lead.id}`,
    });
  }

  async sendOpportunityUpdateEmail(
    opportunity: any,
    assignedUser: User,
    changeType: string,
    oldStage?: string,
  ): Promise<void> {
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

  async sendTicketAssignmentEmail(ticket: any, assignedUser: User): Promise<void> {
    await this.sendEmail(assignedUser.email, `New Ticket Assigned: ${ticket.ticketNumber}`, 'ticket-assigned', {
      userName: `${assignedUser.firstName} ${assignedUser.lastName}`,
      ticketNumber: ticket.ticketNumber,
      ticketTitle: ticket.title,
      ticketDescription: ticket.description,
      priority: ticket.priority,
      dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticket.id}`,
    });
  }

  async sendContractApprovalEmail(contract: any, approver: User): Promise<void> {
    await this.sendEmail(approver.email, `Contract Awaiting Approval: ${contract.contractName}`, 'contract-approval', {
      userName: `${approver.firstName} ${approver.lastName}`,
      contractName: contract.contractName,
      vendor: contract.vendorName,
      amount: contract.amount,
      dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/contracts/${contract.id}`,
    });
  }

  async sendUserCreatedEmail(user: User, tempPassword: string, invitedBy: User): Promise<void> {
    await this.sendEmail(user.email, 'Welcome to CRM System', 'user-created', {
      userName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      tempPassword,
      invitedByName: `${invitedBy.firstName} ${invitedBy.lastName}`,
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
    });
  }

  async sendUserRoleChangeEmail(user: User, newRole: string, changedBy: User): Promise<void> {
    await this.sendEmail(user.email, 'Your Role Has Been Updated', 'user-role-changed', {
      userName: `${user.firstName} ${user.lastName}`,
      newRole,
      changedByName: `${changedBy.firstName} ${changedBy.lastName}`,
      dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
    });
  }
}

export default new EmailService();
