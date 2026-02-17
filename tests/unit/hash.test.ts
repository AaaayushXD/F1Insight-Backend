import { hashPassword, comparePassword } from '../../src/utils/hash';

describe('Password Hashing', () => {
  const plainPassword = 'TestP@ss123';

  it('hashes a password', async () => {
    const hash = await hashPassword(plainPassword);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(plainPassword);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  it('verifies correct password', async () => {
    const hash = await hashPassword(plainPassword);
    const isMatch = await comparePassword(plainPassword, hash);
    expect(isMatch).toBe(true);
  });

  it('rejects incorrect password', async () => {
    const hash = await hashPassword(plainPassword);
    const isMatch = await comparePassword('WrongPassword1!', hash);
    expect(isMatch).toBe(false);
  });

  it('generates different hashes for same password', async () => {
    const hash1 = await hashPassword(plainPassword);
    const hash2 = await hashPassword(plainPassword);
    expect(hash1).not.toBe(hash2);
  });
});
