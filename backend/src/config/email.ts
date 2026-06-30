import nodemailer, { Transporter } from 'nodemailer';
import logger from '../utils/logger';

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
}

let transporter: Transporter | null = null;

export async function initializeEmailTransport(config: EmailConfig): Promise<Transporter> {
  try {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    });

    await transporter.verify();
    logger.info('Email transporter verified successfully');
    return transporter;
  } catch (error) {
    logger.error('Failed to initialize email transporter:', error);
    throw error;
  }
}

export function getEmailTransport(): Transporter | null {
  return transporter;
}

export async function testEmailConnection(config: EmailConfig): Promise<void> {
  try {
    const testTransport = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    });

    await testTransport.verify();
    logger.info('Email connection test successful');
  } catch (error) {
    logger.error('Email connection test failed:', error);
    throw error;
  }
}

export function maskPassword(password: string): string {
  if (password.length <= 4) return '****';
  return password.substring(0, 2) + '*'.repeat(password.length - 4) + password.substring(password.length - 2);
}
