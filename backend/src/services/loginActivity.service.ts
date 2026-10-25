import * as fs from 'fs';
import * as maxmind from 'maxmind';
import { AppDataSource } from '../config/database';
import logger from '../utils/logger';
import securityAlertService from './securityAlert.service';

export type LoginEvent = 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'ACCOUNT_LOCKED' | 'LOGOUT';

export interface LoginActivityInput {
  userId?: string | null;
  emailTried?: string | null;
  event: LoginEvent;
  success: boolean;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface Place {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

const EMPTY_PLACE: Place = { country: null, region: null, city: null, latitude: null, longitude: null };
const RETENTION_DAYS = Number(process.env.LOGIN_ACTIVITY_RETENTION_DAYS) || 365;
const DAY_MS = 86_400_000;
const IPAPI_TIMEOUT_MS = 3000;

// Location is looked up on the server, for the IP the server saw at login.
// GEO_LOOKUP=ipapi calls the ip-api.com JSON endpoint (no key on the free plan).
// Otherwise a local GeoLite2-City database is used when MAXMIND_DB_PATH is set.
// With neither, the location columns stay empty and the IP is still recorded.
type CityReader = Awaited<ReturnType<typeof maxmind.open>>;
let reader: Promise<CityReader | null> | null = null;

function getReader(): Promise<CityReader | null> {
  if (!reader) {
    const dbPath = process.env.MAXMIND_DB_PATH;
    reader = dbPath && fs.existsSync(dbPath)
      ? maxmind.open(dbPath).catch((err) => {
          logger.error(`GeoLite2 database could not be opened: ${err.message}`);
          return null;
        })
      : Promise.resolve(null);
  }
  return reader;
}

// "::ffff:10.0.0.5" -> "10.0.0.5"
function normaliseIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

// Private, loopback and link-local addresses have no public location, so they are not sent anywhere.
function isPublicIp(ip: string): boolean {
  if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return false;
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!v4) return ip.includes(':'); // IPv6 that is not link-local or unique-local
  const [a, b] = [Number(v4[1]), Number(v4[2])];
  return !(a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254));
}

async function lookupIpApi(ip: string): Promise<Place> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IPAPI_TIMEOUT_MS);
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,lat,lon`, {
      signal: controller.signal,
    });
    if (!res.ok) return EMPTY_PLACE;
    const data: any = await res.json();
    if (data.status !== 'success') return EMPTY_PLACE;
    return {
      country: data.country ?? null,
      region: data.regionName ?? null,
      city: data.city ?? null,
      latitude: typeof data.lat === 'number' ? data.lat : null,
      longitude: typeof data.lon === 'number' ? data.lon : null,
    };
  } catch {
    // A slow or failed lookup must never delay or block the login.
    return EMPTY_PLACE;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupMaxmind(ip: string): Promise<Place> {
  const db = await getReader();
  if (!db) return EMPTY_PLACE;
  try {
    const hit: any = db.get(ip);
    if (!hit) return EMPTY_PLACE;
    return {
      country: hit.country?.names?.en ?? null,
      region: hit.subdivisions?.[0]?.names?.en ?? null,
      city: hit.city?.names?.en ?? null,
      latitude: hit.location?.latitude ?? null,
      longitude: hit.location?.longitude ?? null,
    };
  } catch {
    return EMPTY_PLACE;
  }
}

async function locate(ip: string | null): Promise<Place> {
  if (!ip || !isPublicIp(ip)) return EMPTY_PLACE;
  if (process.env.GEO_LOOKUP === 'ipapi') return lookupIpApi(ip);
  if (process.env.MAXMIND_DB_PATH) return lookupMaxmind(ip);
  return EMPTY_PLACE;
}

class LoginActivityService {
  // Never throws: a failed audit write must not break the login it describes.
  async record(input: LoginActivityInput): Promise<void> {
    try {
      const ip = normaliseIp(input.ipAddress);
      const place = await locate(ip);
      const [inserted] = await AppDataSource.query(
        `INSERT INTO login_activity ("userId", "emailTried", event, success, reason, "ipAddress", "userAgent", country, region, city, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [
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
        ]
      );
      // Suspicious-activity checks run in the background: they must never delay or fail the login.
      securityAlertService.evaluate({
        rowId: inserted.id,
        rowEvent: input.event,
        userId: input.userId ?? null,
        emailTried: input.emailTried ?? null,
        ip,
        country: place.country,
      });
    } catch (err: any) {
      logger.error(`Login activity could not be recorded: ${err.message}`);
    }
  }

  async list(filters: { userId?: string; event?: string; from?: string; to?: string; page: number; limit: number }) {
    const where: string[] = [];
    const args: any[] = [];
    const add = (sql: string, v: unknown) => { args.push(v); where.push(sql.replace('?', `$${args.length}`)); };
    if (filters.userId) add('la."userId" = ?', filters.userId);
    if (filters.event) add('la.event = ?', filters.event);
    if (filters.from) add('la."createdAt" >= ?', new Date(`${filters.from}T00:00:00Z`));
    if (filters.to) add('la."createdAt" < ?', new Date(Date.parse(`${filters.to}T00:00:00Z`) + DAY_MS));
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [{ n }] = await AppDataSource.query(`SELECT COUNT(*)::int n FROM login_activity la ${w}`, args);
    const rows = await AppDataSource.query(
      `SELECT la.*, u."firstName" || ' ' || u."lastName" AS "userName"
         FROM login_activity la LEFT JOIN users u ON u.id = la."userId"
         ${w}
         ORDER BY la."createdAt" DESC
         LIMIT ${Number(filters.limit)} OFFSET ${(filters.page - 1) * filters.limit}`,
      args
    );
    return { data: rows, total: n };
  }

  // Deletes rows older than the retention period. Returns the number removed.
  async purgeExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS);
    const removed = await AppDataSource.query(
      `DELETE FROM login_activity WHERE "createdAt" < $1 RETURNING id`,
      [cutoff]
    );
    if (removed.length) logger.info(`Login activity purged: ${removed.length} row(s) older than ${RETENTION_DAYS} days`);
    return removed.length;
  }
}

export const loginActivityRetentionDays = RETENTION_DAYS;
export default new LoginActivityService();
