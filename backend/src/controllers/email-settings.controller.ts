import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { EmailSettings } from '../models/EmailSettings';
import { AppError } from '../middleware/errorHandler';
import { initializeEmailTransport, testEmailConnection, maskPassword } from '../config/email';
import emailService from '../services/email.service';
import logger from '../utils/logger';

export class EmailSettingsController {
  private emailSettingsRepository = AppDataSource.getRepository(EmailSettings);

  async getSettings(req: AuthRequest, res: Response, next: NextFunction) {
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
        smtpPassword: maskPassword(settings.smtpPassword),
      };

      return res.json({ success: true, data: maskedSettings });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, fromName, enableNotifications } = req.body;

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !fromEmail || !fromName) {
        throw new AppError(400, 'All SMTP fields are required');
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
      settings.updatedBy = req.user! as any;

      await this.emailSettingsRepository.save(settings);

      logger.info(`Email settings updated by ${req.user?.email}`);

      const maskedSettings = {
        ...settings,
        smtpPassword: maskPassword(settings.smtpPassword),
      };

      return res.json({ success: true, data: maskedSettings });
    } catch (error) {
      next(error);
    }
  }

  async testConnection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const settings = await this.emailSettingsRepository.findOne({
        where: {},
      });

      if (!settings || !settings.isConfigured) {
        throw new AppError(400, 'Email settings not configured');
      }

      await testEmailConnection({
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPassword: settings.smtpPassword,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
      });

      logger.info(`Email connection tested successfully by ${req.user?.email}`);

      return res.json({
        success: true,
        data: {
          message: 'Email connection successful',
          host: settings.smtpHost,
          port: settings.smtpPort,
          user: settings.smtpUser,
        },
      });
    } catch (error) {
      logger.error('Email connection test failed:', error);
      next(error);
    }
  }

  async sendTestEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const settings = await this.emailSettingsRepository.findOne({
        where: {},
      });

      if (!settings || !settings.isConfigured) {
        throw new AppError(400, 'Email settings not configured');
      }

      const testEmail = req.user?.email;
      if (!testEmail) {
        throw new AppError(400, 'User email not found');
      }

      await emailService.sendEmail(testEmail, 'CRM Email Configuration Test', 'test-email', {
        userName: req.user?.email || 'User',
        timestamp: new Date().toISOString(),
      });

      logger.info(`Test email sent to ${testEmail} by ${req.user?.email}`);

      return res.json({
        success: true,
        data: {
          message: 'Test email sent successfully',
          sentTo: testEmail,
        },
      });
    } catch (error) {
      logger.error('Failed to send test email:', error);
      next(error);
    }
  }
}

export default new EmailSettingsController();
