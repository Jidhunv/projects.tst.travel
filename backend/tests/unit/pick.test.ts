import pick from '../../src/utils/pick';

describe('pick (mass-assignment whitelist)', () => {
  it('copies only the listed keys', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('omits keys absent from the body, so a PATCH stays partial', () => {
    // If missing keys came through as undefined, TypeORM would blank the
    // corresponding columns on every partial update.
    const result = pick({ a: 1 }, ['a', 'b']);
    expect(result).toEqual({ a: 1 });
    expect('b' in result).toBe(false);
  });

  it('keeps a key that is explicitly null or empty, so a field can be cleared', () => {
    expect(pick({ email: null, note: '' }, ['email', 'note'])).toEqual({ email: null, note: '' });
  });

  it('drops system-managed fields even when the client sends them', () => {
    // The exact payload that forged SLA compliance before this existed.
    const body = {
      title: 'legitimate edit',
      resolvedAt: '2020-01-01T00:00:00.000Z',
      respondedAt: '2020-01-01T00:00:00.000Z',
      createdAt: '2020-01-01T00:00:00.000Z',
      ticketNumber: 'FORGED-1',
    };
    expect(pick(body, ['title', 'priority'])).toEqual({ title: 'legitimate edit' });
  });

  it('ignores inherited properties', () => {
    // Object.create puts `admin` on the prototype; `in` would find it, so this
    // guards against prototype-chain leakage into an update payload.
    const body = Object.create({ admin: true });
    body.name = 'ok';
    const result = pick(body, ['name', 'admin']);
    expect(result).toEqual({ name: 'ok' });
  });

  it('returns an empty object when nothing matches', () => {
    expect(pick({ evil: 1 }, ['name'])).toEqual({});
  });
});
