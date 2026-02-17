import { User, IUser } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { AuditLog } from '../models/AuditLog';
import { hashPassword, comparePassword } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../utils/jwt';
import { createAndSendOTP, verifyOTP } from './otp.service';
import { sendEmail, buildWelcomeEmail } from './email.service';
import { ApiError } from '../utils/apiError';

interface SignupParams {
  email: string;
  password: string;
  name: string;
}

interface LoginParams {
  email: string;
  password: string;
  userAgent: string;
  ipAddress: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  user: { id: string; email: string; name: string; role: string };
  tokens: TokenPair;
}

function userId(user: IUser): string {
  return user._id.toString();
}

// --- Signup ---

export async function signup(params: SignupParams): Promise<{ userId: string; message: string }> {
  const { email, password, name } = params;

  const existing = await User.findOne({ email });
  if (existing && existing.isVerified) {
    throw ApiError.conflict('Email already registered');
  }

  // If user exists but not verified, allow re-registration (update password, resend OTP)
  let user: IUser;
  if (existing && !existing.isVerified) {
    existing.password = await hashPassword(password);
    existing.name = name;
    await existing.save();
    user = existing;
  } else {
    const hashedPassword = await hashPassword(password);
    user = await User.create({ email, password: hashedPassword, name });
  }

  await createAndSendOTP({
    userId: userId(user),
    email: user.email,
    name: user.name,
    purpose: 'signup',
  });

  return {
    userId: userId(user),
    message: 'Account created. Please verify your email with the OTP sent.',
  };
}

// --- Verify OTP (after signup) ---

export async function verifySignupOTP(
  uid: string,
  code: string,
  userAgent: string,
  ipAddress: string,
): Promise<AuthResult> {
  await verifyOTP(uid, code, 'signup');

  const user = await User.findById(uid);
  if (!user) throw ApiError.notFound('User not found');

  user.isVerified = true;
  user.lastLogin = new Date();
  user.loginCount += 1;
  await user.save();

  const tokens = await generateTokenPair(user, userAgent, ipAddress);

  // Send welcome email
  sendEmail({
    to: user.email,
    subject: 'Welcome to F1Insight!',
    html: buildWelcomeEmail(user.name),
  });

  await createAuditLog(userId(user), 'signup-verified', 'user', {}, ipAddress, userAgent);

  return {
    user: { id: userId(user), email: user.email, name: user.name, role: user.role },
    tokens,
  };
}

// --- Login ---

export async function login(params: LoginParams): Promise<AuthResult | { requiresOTP: true; userId: string }> {
  const { email, password, userAgent, ipAddress } = params;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    await createAuditLog(userId(user), 'login-failed', 'user', { reason: 'wrong-password' }, ipAddress, userAgent);
    throw ApiError.unauthorized('Invalid email or password');
  }

  // If not verified, send OTP and require verification
  if (!user.isVerified) {
    await createAndSendOTP({
      userId: userId(user),
      email: user.email,
      name: user.name,
      purpose: 'signup',
    });
    return { requiresOTP: true, userId: userId(user) };
  }

  // Update login metadata
  user.lastLogin = new Date();
  user.loginCount += 1;
  await user.save();

  const tokens = await generateTokenPair(user, userAgent, ipAddress);

  await createAuditLog(userId(user), 'login', 'user', {}, ipAddress, userAgent);

  return {
    user: { id: userId(user), email: user.email, name: user.name, role: user.role },
    tokens,
  };
}

// --- Refresh Token ---

export async function refreshAccessToken(
  refreshTokenValue: string,
  userAgent: string,
  ipAddress: string,
): Promise<TokenPair> {
  // Verify the JWT signature
  const payload = verifyRefreshToken(refreshTokenValue);

  // Find the stored refresh token
  const storedTokens = await RefreshToken.find({ userId: payload.userId });
  const matchingToken = storedTokens.find((t) => t.token === refreshTokenValue);

  if (!matchingToken) {
    // Token reuse detected — revoke all tokens for this user (potential theft)
    await RefreshToken.deleteMany({ userId: payload.userId });
    throw ApiError.unauthorized('Token reuse detected. All sessions revoked.');
  }

  // Delete old token (rotation)
  await RefreshToken.deleteOne({ _id: matchingToken._id });

  // Fetch fresh user data
  const user = await User.findById(payload.userId);
  if (!user) throw ApiError.unauthorized('User not found');

  return generateTokenPair(user, userAgent, ipAddress);
}

// --- Logout ---

export async function logout(
  refreshTokenValue: string | undefined,
  uid: string,
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  if (refreshTokenValue) {
    const storedTokens = await RefreshToken.find({ userId: uid });
    const matchingToken = storedTokens.find((t) => t.token === refreshTokenValue);
    if (matchingToken) {
      await RefreshToken.deleteOne({ _id: matchingToken._id });
    }
  }

  await createAuditLog(uid, 'logout', 'user', {}, ipAddress, userAgent);
}

// --- Forgot Password ---

export async function forgotPassword(email: string): Promise<{ userId: string; message: string }> {
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal whether email exists
    return { userId: '', message: 'If the email exists, an OTP has been sent.' };
  }

  await createAndSendOTP({
    userId: userId(user),
    email: user.email,
    name: user.name,
    purpose: 'password-reset',
  });

  return { userId: userId(user), message: 'If the email exists, an OTP has been sent.' };
}

// --- Reset Password ---

export async function resetPassword(
  uid: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await verifyOTP(uid, code, 'password-reset');

  const user = await User.findById(uid).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  user.password = await hashPassword(newPassword);
  await user.save();

  // Revoke all refresh tokens (force re-login everywhere)
  await RefreshToken.deleteMany({ userId: uid });

  await createAuditLog(uid, 'password-reset', 'user', {}, '', '');
}

// --- Resend OTP ---

export async function resendOTP(
  uid: string,
  purpose: 'signup' | 'login' | 'password-reset',
): Promise<void> {
  const user = await User.findById(uid);
  if (!user) throw ApiError.notFound('User not found');

  await createAndSendOTP({
    userId: userId(user),
    email: user.email,
    name: user.name,
    purpose,
  });
}

// --- Helpers ---

async function generateTokenPair(user: IUser, userAgent: string, ipAddress: string): Promise<TokenPair> {
  const payload: TokenPayload = {
    userId: userId(user),
    email: user.email,
    role: user.role,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Parse expiry from env (e.g., "7d" → 7 days in ms)
  const expiryMatch = /^(\d+)([smhd])$/.exec(process.env.JWT_REFRESH_EXPIRY || '7d');
  let expiresInMs = 7 * 24 * 60 * 60 * 1000; // default 7 days
  if (expiryMatch) {
    const val = parseInt(expiryMatch[1]);
    const unit = expiryMatch[2];
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    expiresInMs = val * (multipliers[unit] || 86400000);
  }

  // Store refresh token (plaintext — token is already a signed JWT)
  await RefreshToken.create({
    userId: user._id,
    token: refreshToken,
    userAgent,
    ipAddress,
    expiresAt: new Date(Date.now() + expiresInMs),
  });

  return { accessToken, refreshToken };
}

async function createAuditLog(
  uid: string,
  action: string,
  resource: string,
  details: Record<string, any>,
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  await AuditLog.create({ userId: uid, action, resource, details, ipAddress, userAgent });
}
