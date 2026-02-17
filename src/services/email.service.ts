import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: parseInt(env.SMTP_PORT),
  secure: false,
  auth:
    env.SMTP_USER && env.SMTP_PASS
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    logger.info('Email sent', { to: options.to, subject: options.subject });
  } catch (error) {
    logger.error('Email send failed', { to: options.to, error });
    // Don't throw — email failure shouldn't block the auth flow
    // The user can always resend
  }
}

export function buildOTPEmail(name: string, code: string): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; padding: 40px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #E10600; font-size: 28px; margin: 0;">F1Insight</h1>
        <p style="color: #888; font-size: 14px; margin-top: 4px;">Race Intelligence Platform</p>
      </div>
      <p style="font-size: 16px; margin-bottom: 8px;">Hi <strong>${name}</strong>,</p>
      <p style="font-size: 14px; color: #aaa; margin-bottom: 24px;">Your verification code is:</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #E10600; background: #2a2a3e; padding: 16px 32px; border-radius: 8px; display: inline-block;">
          ${code}
        </span>
      </div>
      <p style="font-size: 13px; color: #888; text-align: center; margin-top: 24px;">
        This code expires in <strong>5 minutes</strong>. Do not share it with anyone.
      </p>
      <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />
      <p style="font-size: 12px; color: #666; text-align: center;">
        If you didn't request this code, please ignore this email.
      </p>
    </div>
  `;
}

export function buildWelcomeEmail(name: string): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; padding: 40px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #E10600; font-size: 28px; margin: 0;">F1Insight</h1>
      </div>
      <p style="font-size: 16px;">Welcome aboard, <strong>${name}</strong>!</p>
      <p style="font-size: 14px; color: #aaa;">Your account has been verified. You now have full access to the F1Insight dashboard — predictions, strategy simulations, and race analytics.</p>
      <p style="font-size: 14px; color: #aaa; margin-top: 16px;">Head to your dashboard to get started.</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />
      <p style="font-size: 12px; color: #666; text-align: center;">F1Insight — Race Intelligence Platform</p>
    </div>
  `;
}
