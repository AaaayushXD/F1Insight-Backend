import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, TokenPayload } from '../../src/utils/jwt';

describe('JWT Utilities', () => {
  const payload: TokenPayload = {
    userId: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    role: 'user',
  };

  describe('Access Token', () => {
    it('signs and verifies a token', () => {
      const token = signAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('throws on invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });

    it('cannot be verified with refresh secret', () => {
      const token = signAccessToken(payload);
      expect(() => verifyRefreshToken(token)).toThrow();
    });
  });

  describe('Refresh Token', () => {
    it('signs and verifies a token', () => {
      const token = signRefreshToken(payload);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(payload.userId);
    });

    it('cannot be verified with access secret', () => {
      const token = signRefreshToken(payload);
      expect(() => verifyAccessToken(token)).toThrow();
    });
  });
});
