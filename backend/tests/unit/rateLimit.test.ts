import { Request, Response } from 'express';
import { loginLimiter, __resetRateLimitStore } from '../../src/middleware/rateLimit';

/** Drive the middleware and report whether it passed the request through. */
function attempt(email: string | undefined, ip: string): { allowed: boolean; status?: number } {
  const req = { body: email ? { email } : {}, ip } as unknown as Request;

  let status: number | undefined;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;

  let allowed = false;
  loginLimiter(req, res, () => {
    allowed = true;
  });

  return { allowed, status };
}

describe('login rate limiting', () => {
  beforeEach(() => __resetRateLimitStore());

  it('allows attempts up to the per-email budget, then blocks', () => {
    const results = Array.from({ length: 7 }, () => attempt('user@test.local', '10.0.0.1'));
    expect(results.slice(0, 5).every((r) => r.allowed)).toBe(true);
    expect(results[5].allowed).toBe(false);
    expect(results[5].status).toBe(429);
  });

  it('blocks password spraying: many accounts, one IP', () => {
    // The regression this suite exists for. The limiter used to key only on
    // email, so each new address got a fresh budget and a single source could
    // try one password against unlimited accounts unthrottled.
    const results = Array.from({ length: 30 }, (_, i) =>
      attempt(`victim-${i}@test.local`, '10.0.0.99')
    );

    const blocked = results.filter((r) => !r.allowed);
    expect(blocked.length).toBeGreaterThan(0);

    // The IP budget is 20, so the 21st distinct account must be refused.
    expect(results[20].allowed).toBe(false);
  });

  it('keeps separate budgets per IP', () => {
    // One noisy client must not lock out everyone else.
    for (let i = 0; i < 25; i++) attempt(`a-${i}@test.local`, '10.0.0.1');
    expect(attempt('fresh@test.local', '10.0.0.2').allowed).toBe(true);
  });

  it('keeps separate budgets per email', () => {
    for (let i = 0; i < 6; i++) attempt('locked@test.local', '10.0.0.3');
    expect(attempt('locked@test.local', '10.0.0.3').allowed).toBe(false);
    // A different account from the same IP is still within the IP budget.
    expect(attempt('other@test.local', '10.0.0.3').allowed).toBe(true);
  });

  it('treats an email as the same account regardless of case', () => {
    for (let i = 0; i < 5; i++) attempt('Case@Test.local', '10.0.0.4');
    expect(attempt('case@test.local', '10.0.0.4').allowed).toBe(false);
  });

  it('still limits by IP when no email is supplied', () => {
    const results = Array.from({ length: 25 }, () => attempt(undefined, '10.0.0.5'));
    expect(results[20].allowed).toBe(false);
  });

  it('resets after the window elapses', () => {
    jest.useFakeTimers();
    try {
      for (let i = 0; i < 6; i++) attempt('window@test.local', '10.0.0.6');
      expect(attempt('window@test.local', '10.0.0.6').allowed).toBe(false);

      jest.advanceTimersByTime(15 * 60 * 1000 + 1000);
      expect(attempt('window@test.local', '10.0.0.6').allowed).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
