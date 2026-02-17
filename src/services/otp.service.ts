import { OTP, IOTP } from '../models/OTP';
import { generateOTP } from '../utils/otp';
import { hashPassword, comparePassword } from '../utils/hash';
import { sendEmail, buildOTPEmail } from './email.service';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import mongoose from 'mongoose';

const MAX_ATTEMPTS = 5;

interface CreateOTPParams {
  userId: string;
  email: string;
  name: string;
  purpose: 'signup' | 'login' | 'password-reset';
}

export async function createAndSendOTP(params: CreateOTPParams): Promise<void> {
  const { userId, email, name, purpose } = params;

  // Delete any existing OTP for this user + purpose
  await OTP.deleteMany({ userId: new mongoose.Types.ObjectId(userId), purpose });

  const code = generateOTP();
  const hashedCode = await hashPassword(code);

  const expiryMinutes = parseInt(env.OTP_EXPIRY_MINUTES);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await OTP.create({
    userId: new mongoose.Types.ObjectId(userId),
    email,
    code: hashedCode,
    purpose,
    expiresAt,
  });

  // Send email asynchronously (don't await to avoid blocking)
  const html = buildOTPEmail(name, code);
  sendEmail({
    to: email,
    subject: `Your F1Insight Verification Code: ${code}`,
    html,
  });
}

export async function verifyOTP(
  userId: string,
  code: string,
  purpose: 'signup' | 'login' | 'password-reset',
): Promise<void> {
  const otpRecord = await OTP.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    purpose,
  });

  if (!otpRecord) {
    throw ApiError.badRequest('No OTP found. Please request a new one.');
  }

  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw ApiError.tooManyRequests('Maximum OTP attempts exceeded. Please request a new code.');
  }

  const isValid = await comparePassword(code, otpRecord.code);

  if (!isValid) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const remaining = MAX_ATTEMPTS - otpRecord.attempts;
    throw ApiError.badRequest(
      `Invalid OTP code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
    );
  }

  // Valid — delete the OTP
  await OTP.deleteOne({ _id: otpRecord._id });
}
