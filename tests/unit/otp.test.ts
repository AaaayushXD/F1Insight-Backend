import { generateOTP } from '../../src/utils/otp';

describe('OTP Generation', () => {
  it('generates a 6-digit string', () => {
    const otp = generateOTP();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('generates codes between 100000 and 999999', () => {
    for (let i = 0; i < 100; i++) {
      const otp = generateOTP();
      const num = parseInt(otp);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it('generates sufficiently unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateOTP()));
    expect(codes.size).toBeGreaterThan(85);
  });
});
