"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginActivityRetentionDays = void 0;
const fs = __importStar(require("fs"));
const maxmind = __importStar(require("maxmind"));
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
const securityAlert_service_1 = __importDefault(require("./securityAlert.service"));
const EMPTY_PLACE = { country: null, region: null, city: null, latitude: null, longitude: null };
const RETENTION_DAYS = Number(process.env.LOGIN_ACTIVITY_RETENTION_DAYS) || 365;
const DAY_MS = 86400000;
const IPAPI_TIMEOUT_MS = 3000;
let reader = null;
function getReader() {
    if (!reader) {
        const dbPath = process.env.MAXMIND_DB_PATH;
        reader = dbPath && fs.existsSync(dbPath)
            ? maxmind.open(dbPath).catch((err) => {
                logger_1.default.error(`GeoLite2 database could not be opened: ${err.message}`);
                return null;
            })
            : Promise.resolve(null);
    }
    return reader;
}
// "::ffff:10.0.0.5" -> "10.0.0.5"
function normaliseIp(ip) {
    if (!ip)
        return null;
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}
// Private, loopback and link-local addresses have no public location, so they are not sent anywhere.
function isPublicIp(ip) {
    if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd'))
        return false;
    const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!v4)
        return ip.includes(':'); // IPv6 that is not link-local or unique-local
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return !(a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254));
}
async function lookupIpApi(ip) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IPAPI_TIMEOUT_MS);
    try {
        const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,lat,lon`, {
            signal: controller.signal,
        });
        if (!res.ok)
            return EMPTY_PLACE;
        const data = await res.json();
        if (data.status !== 'success')
            return EMPTY_PLACE;
        return {
            country: data.country ?? null,
            region: data.regionName ?? null,
            city: data.city ?? null,
            latitude: typeof data.lat === 'number' ? data.lat : null,
            longitude: typeof data.lon === 'number' ? data.lon : null,
        };
    }
    catch {
        // A slow or failed lookup must never delay or block the login.
        return EMPTY_PLACE;
    }
    finally {
        clearTimeout(timer);
    }
}
async function lookupMaxmind(ip) {
    const db = await getReader();
    if (!db)
        return EMPTY_PLACE;
    try {
        const hit = db.get(ip);
        if (!hit)
            return EMPTY_PLACE;
        return {
            country: hit.country?.names?.en ?? null,
            region: hit.subdivisions?.[0]?.names?.en ?? null,
            city: hit.city?.names?.en ?? null,
            latitude: hit.location?.latitude ?? null,
            longitude: hit.location?.longitude ?? null,
        };
    }
    catch {
        return EMPTY_PLACE;
    }
}
async function locate(ip) {
    if (!ip || !isPublicIp(ip))
        return EMPTY_PLACE;
    if (process.env.GEO_LOOKUP === 'ipapi')
        return lookupIpApi(ip);
    if (process.env.MAXMIND_DB_PATH)
        return lookupMaxmind(ip);
    return EMPTY_PLACE;
}
class LoginActivityService {
    // Never throws: a failed audit write must not break the login it describes.
    async record(input) {
        try {
            const ip = normaliseIp(input.ipAddress);
            const place = await locate(ip);
            const [inserted] = await database_1.AppDataSource.query(`INSERT INTO login_activity ("userId", "emailTried", event, success, reason, "ipAddress", "userAgent", country, region, city, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`, [
                input.userId ?? null,
                input.emailTried ? input.emailTried.slice(0, 255) : null,
                input.event,
                input.success,
                input.reason ? input.reason.slice(0, 255) : null,
                ip,
                input.userAgent ? input.userAgent.slice(0, 500) : null,
                place.country,
                place.region,
                place.city,
                place.latitude,
                place.longitude,
            ]);
            // Suspicious-activity checks run in the background: they must never delay or fail the login.
            securityAlert_service_1.default.evaluate({
                rowId: inserted.id,
                rowEvent: input.event,
                userId: input.userId ?? null,
                emailTried: input.emailTried ?? null,
                ip,
                country: place.country,
            });
        }
        catch (err) {
            logger_1.default.error(`Login activity could not be recorded: ${err.message}`);
        }
    }
    async list(filters) {
        const where = [];
        const args = [];
        const add = (sql, v) => { args.push(v); where.push(sql.replace('?', `$${args.length}`)); };
        if (filters.userId)
            add('la."userId" = ?', filters.userId);
        if (filters.event)
            add('la.event = ?', filters.event);
        if (filters.from)
            add('la."createdAt" >= ?', new Date(`${filters.from}T00:00:00Z`));
        if (filters.to)
            add('la."createdAt" < ?', new Date(Date.parse(`${filters.to}T00:00:00Z`) + DAY_MS));
        const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [{ n }] = await database_1.AppDataSource.query(`SELECT COUNT(*)::int n FROM login_activity la ${w}`, args);
        const rows = await database_1.AppDataSource.query(`SELECT la.*, u."firstName" || ' ' || u."lastName" AS "userName"
         FROM login_activity la LEFT JOIN users u ON u.id = la."userId"
         ${w}
         ORDER BY la."createdAt" DESC
         LIMIT ${Number(filters.limit)} OFFSET ${(filters.page - 1) * filters.limit}`, args);
        return { data: rows, total: n };
    }
    // Deletes rows older than the retention period. Returns the number removed.
    async purgeExpired() {
        const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS);
        const removed = await database_1.AppDataSource.query(`DELETE FROM login_activity WHERE "createdAt" < $1 RETURNING id`, [cutoff]);
        if (removed.length)
            logger_1.default.info(`Login activity purged: ${removed.length} row(s) older than ${RETENTION_DAYS} days`);
        return removed.length;
    }
}
exports.loginActivityRetentionDays = RETENTION_DAYS;
exports.default = new LoginActivityService();
//# sourceMappingURL=loginActivity.service.js.map