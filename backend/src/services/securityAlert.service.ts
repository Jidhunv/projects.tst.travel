import { AppDataSource } from '../config/database';
import notificationService from './notification.service';
import logger from '../utils/logger';

export type AlertSeverity = 'low' | 'medium' | 'high';

interface EvaluateInput {
  rowId: string;
  rowEvent: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'ACCOUNT_LOCKED' | 'LOGOUT';
  userId: string | null;
  emailTried: string | null;
  ip: string | null;
  country: string | null;
}

const DEDUPE_MINUTES = 60;
const SPRAY_THRESHOLD = 10; // failed logins from one IP, 15 minutes
const ACCOUNT_THRESHOLD = 5; // failed or locked attempts against one email, 15 minutes
const AFTER_FAILURES_THRESHOLD = 3; // failures before a success, 30 minutes

class SecurityAlertService {
  // Runs after each login event. Never throws and is not awaited by the login path.
  async evaluate(input: EvaluateInput): Promise<void> {
    try {
      if (input.rowEvent === 'LOGOUT') return;
      const checks = [
        () => this.ipSpray(input),
        () => this.accountAttack(input),
        () => this.successAfterFailures(input),
        () => this.newCountry(input),
        () => this.newIp(input),
      ];
      for (const check of checks) await check();
    } catch (err: any) {
      logger.error(`Security alert check failed: ${err.message}`);
    }
  }

  private async ipSpray(input: EvaluateInput) {
    if (!input.ip || input.rowEvent !== 'LOGIN_FAILURE') return;
    const [{ n }] = await AppDataSource.query(
      `SELECT COUNT(*)::int n FROM login_activity
        WHERE "ipAddress" = $1 AND event = 'LOGIN_FAILURE' AND "createdAt" > now() - interval '15 minutes'`,
      [input.ip]
    );
    if (n >= SPRAY_THRESHOLD) {
      await this.raise('ip_spray', 'high', input.ip, null,
        `${n} failed logins from IP ${input.ip} in 15 minutes (possible password spraying)`, { ip: input.ip, failures: n });
    }
  }

  private async accountAttack(input: EvaluateInput) {
    if (!input.emailTried || (input.rowEvent !== 'LOGIN_FAILURE' && input.rowEvent !== 'ACCOUNT_LOCKED')) return;
    const [{ n }] = await AppDataSource.query(
      `SELECT COUNT(*)::int n FROM login_activity
        WHERE "emailTried" = $1 AND event IN ('LOGIN_FAILURE', 'ACCOUNT_LOCKED') AND "createdAt" > now() - interval '15 minutes'`,
      [input.emailTried]
    );
    if (n >= ACCOUNT_THRESHOLD) {
      await this.raise('account_attack', 'high', input.emailTried, input.userId,
        `${n} failed login attempts for ${input.emailTried} in 15 minutes`, { email: input.emailTried, attempts: n });
    }
  }

  private async successAfterFailures(input: EvaluateInput) {
    if (input.rowEvent !== 'LOGIN_SUCCESS' || !input.emailTried) return;
    const [{ n }] = await AppDataSource.query(
      `SELECT COUNT(*)::int n FROM login_activity
        WHERE "emailTried" = $1 AND event IN ('LOGIN_FAILURE', 'ACCOUNT_LOCKED') AND "createdAt" > now() - interval '30 minutes'`,
      [input.emailTried]
    );
    if (n >= AFTER_FAILURES_THRESHOLD) {
      await this.raise('success_after_failures', 'high', input.emailTried, input.userId,
        `${input.emailTried} logged in successfully after ${n} failed attempts`, { email: input.emailTried, failedBefore: n, ip: input.ip });
    }
  }

  // Compares with the user's successful logins over the last 90 days (excluding this one).
  private async newCountry(input: EvaluateInput) {
    if (input.rowEvent !== 'LOGIN_SUCCESS' || !input.userId || !input.country) return;
    const rows: Array<{ country: string }> = await AppDataSource.query(
      `SELECT DISTINCT country FROM login_activity
        WHERE "userId" = $1 AND event = 'LOGIN_SUCCESS' AND country IS NOT NULL
          AND "createdAt" > now() - interval '90 days'
          AND id <> $3`,
      [input.userId, input.ip, input.rowId]
    );
    if (rows.length === 0) return; // no history to compare with yet
    if (!rows.some((r) => r.country === input.country)) {
      await this.raise('new_country', 'medium', input.userId, input.userId,
        `Login to ${input.emailTried || 'an account'} from a new country: ${input.country}`,
        { country: input.country, ip: input.ip });
    }
  }

  private async newIp(input: EvaluateInput) {
    if (input.rowEvent !== 'LOGIN_SUCCESS' || !input.userId || !input.ip) return;
    const [{ prior }] = await AppDataSource.query(
      `SELECT COUNT(*)::int prior FROM login_activity
        WHERE "userId" = $1 AND event = 'LOGIN_SUCCESS' AND "createdAt" > now() - interval '90 days'
          AND id <> $3`,
      [input.userId, input.ip, input.rowId]
    );
    if (prior === 0) return; // first login ever: nothing to compare with
    const [{ seen }] = await AppDataSource.query(
      `SELECT COUNT(*)::int seen FROM login_activity
        WHERE "userId" = $1 AND event = 'LOGIN_SUCCESS' AND "ipAddress" = $2
          AND "createdAt" > now() - interval '90 days' AND id <> $3`,
      [input.userId, input.ip, input.rowId]
    );
    if (seen === 0) {
      await this.raise('new_ip', 'low', input.userId, input.userId,
        `Login to ${input.emailTried || 'an account'} from an IP not seen before: ${input.ip}`,
        { ip: input.ip });
    }
  }

  // Records the alert once per rule and subject per hour, then tells every active admin.
  private async raise(ruleCode: string, severity: AlertSeverity, subject: string, userId: string | null, summary: string, details: Record<string, unknown>) {
    const [{ recent }] = await AppDataSource.query(
      `SELECT COUNT(*)::int recent FROM security_alerts
        WHERE "ruleCode" = $1 AND subject = $2 AND "createdAt" > now() - interval '${DEDUPE_MINUTES} minutes'`,
      [ruleCode, subject]
    );
    if (recent > 0) return;

    await AppDataSource.query(
      `INSERT INTO security_alerts ("ruleCode", severity, subject, summary, details, "userId") VALUES ($1, $2, $3, $4, $5, $6)`,
      [ruleCode, severity, subject.slice(0, 255), summary.slice(0, 500), JSON.stringify(details), userId]
    );
    logger.warn(`Security alert [${severity}] ${ruleCode}: ${summary}`);

    const admins: Array<{ id: string }> = await AppDataSource.query(
      `SELECT u.id FROM users u JOIN roles r ON r.id = u."roleId" WHERE r.name = 'Admin' AND u."isActive" = TRUE`
    );
    for (const admin of admins) {
      await notificationService.createNotification({
        type: 'SecurityAlert',
        title: `Security alert (${severity})`,
        message: summary,
        recipientId: admin.id,
        actionUrl: '/security-alerts',
        actionLabel: 'View alerts',
      });
    }
  }
}

export default new SecurityAlertService();
