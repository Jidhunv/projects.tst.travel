"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const notification_service_1 = __importDefault(require("./notification.service"));
const logger_1 = __importDefault(require("../utils/logger"));
const DEDUPE_MINUTES = 60;
const SPRAY_THRESHOLD = 10; // failed logins from one IP, 15 minutes
const ACCOUNT_THRESHOLD = 5; // failed or locked attempts against one email, 15 minutes
const AFTER_FAILURES_THRESHOLD = 3; // failures before a success, 30 minutes
class SecurityAlertService {
    // Runs after each login event. Never throws and is not awaited by the login path.
    async evaluate(input) {
        try {
            if (input.rowEvent === 'LOGOUT')
                return;
            const checks = [
                () => this.ipSpray(input),
                () => this.accountAttack(input),
                () => this.successAfterFailures(input),
                () => this.newCountry(input),
                () => this.newIp(input),
            ];
            for (const check of checks)
                await check();
        }
        catch (err) {
            logger_1.default.error(`Security alert check failed: ${err.message}`);
        }
    }
    async ipSpray(input) {
        if (!input.ip || input.rowEvent !== 'LOGIN_FAILURE')
            return;
        const [{ n }] = await database_1.AppDataSource.query(`SELECT COUNT(*)::int n FROM login_activity
        WHERE "ipAddress" = $1 AND event = 'LOGIN_FAILURE' AND "createdAt" > now() - interval '15 minutes'`, [input.ip]);
        if (n >= SPRAY_THRESHOLD) {
            await this.raise('ip_spray', 'high', input.ip, null, `${n} failed logins from IP ${input.ip} in 15 minutes (possible password spraying)`, { ip: input.ip, failures: n });
        }
    }
    async accountAttack(input) {
        if (!input.emailTried || (input.rowEvent !== 'LOGIN_FAILURE' && input.rowEvent !== 'ACCOUNT_LOCKED'))
            return;
        const [{ n }] = await database_1.AppDataSource.query(`SELECT COUNT(*)::int n FROM login_activity
        WHERE "emailTried" = $1 AND event IN ('LOGIN_FAILURE', 'ACCOUNT_LOCKED') AND "createdAt" > now() - interval '15 minutes'`, [input.emailTried]);
        if (n >= ACCOUNT_THRESHOLD) {
            await this.raise('account_attack', 'high', input.emailTried, input.userId, `${n} failed login attempts for ${input.emailTried} in 15 minutes`, { email: input.emailTried, attempts: n });
        }
    }
    async successAfterFailures(input) {
        if (input.rowEvent !== 'LOGIN_SUCCESS' || !input.emailTried)
            return;
        const [{ n }] = await database_1.AppDataSource.query(`SELECT COUNT(*)::int n FROM login_activity
        WHERE "emailTried" = $1 AND event IN ('LOGIN_FAILURE', 'ACCOUNT_LOCKED') AND "createdAt" > now() - interval '30 minutes'`, [input.emailTried]);
        if (n >= AFTER_FAILURES_THRESHOLD) {
            await this.raise('success_after_failures', 'high', input.emailTried, input.userId, `${input.emailTried} logged in successfully after ${n} failed attempts`, { email: input.emailTried, failedBefore: n, ip: input.ip });
        }
    }
    // Compares with the user's successful logins over the last 90 days (excluding this one).
    async newCountry(input) {
        if (input.rowEvent !== 'LOGIN_SUCCESS' || !input.userId || !input.country)
            return;
        const rows = await database_1.AppDataSource.query(`SELECT DISTINCT country FROM login_activity
        WHERE "userId" = $1 AND event = 'LOGIN_SUCCESS' AND country IS NOT NULL
          AND "createdAt" > now() - interval '90 days'
          AND id <> $3`, [input.userId, input.ip, input.rowId]);
        if (rows.length === 0)
            return; // no history to compare with yet
        if (!rows.some((r) => r.country === input.country)) {
            await this.raise('new_country', 'medium', input.userId, input.userId, `Login to ${input.emailTried || 'an account'} from a new country: ${input.country}`, { country: input.country, ip: input.ip });
        }
    }
    async newIp(input) {
        if (input.rowEvent !== 'LOGIN_SUCCESS' || !input.userId || !input.ip)
            return;
        const [{ prior }] = await database_1.AppDataSource.query(`SELECT COUNT(*)::int prior FROM login_activity
        WHERE "userId" = $1 AND event = 'LOGIN_SUCCESS' AND "createdAt" > now() - interval '90 days'
          AND id <> $3`, [input.userId, input.ip, input.rowId]);
        if (prior === 0)
            return; // first login ever: nothing to compare with
        const [{ seen }] = await database_1.AppDataSource.query(`SELECT COUNT(*)::int seen FROM login_activity
        WHERE "userId" = $1 AND event = 'LOGIN_SUCCESS' AND "ipAddress" = $2
          AND "createdAt" > now() - interval '90 days' AND id <> $3`, [input.userId, input.ip, input.rowId]);
        if (seen === 0) {
            await this.raise('new_ip', 'low', input.userId, input.userId, `Login to ${input.emailTried || 'an account'} from an IP not seen before: ${input.ip}`, { ip: input.ip });
        }
    }
    // Records the alert once per rule and subject per hour, then tells every active admin.
    async raise(ruleCode, severity, subject, userId, summary, details) {
        const [{ recent }] = await database_1.AppDataSource.query(`SELECT COUNT(*)::int recent FROM security_alerts
        WHERE "ruleCode" = $1 AND subject = $2 AND "createdAt" > now() - interval '${DEDUPE_MINUTES} minutes'`, [ruleCode, subject]);
        if (recent > 0)
            return;
        await database_1.AppDataSource.query(`INSERT INTO security_alerts ("ruleCode", severity, subject, summary, details, "userId") VALUES ($1, $2, $3, $4, $5, $6)`, [ruleCode, severity, subject.slice(0, 255), summary.slice(0, 500), JSON.stringify(details), userId]);
        logger_1.default.warn(`Security alert [${severity}] ${ruleCode}: ${summary}`);
        const admins = await database_1.AppDataSource.query(`SELECT u.id FROM users u JOIN roles r ON r.id = u."roleId" WHERE r.name = 'Admin' AND u."isActive" = TRUE`);
        for (const admin of admins) {
            await notification_service_1.default.createNotification({
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
exports.default = new SecurityAlertService();
//# sourceMappingURL=securityAlert.service.js.map