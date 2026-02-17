import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  code: string; // bcrypt-hashed
  purpose: 'signup' | 'login' | 'password-reset';
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['signup', 'login', 'password-reset'],
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Fast lookup by userId + purpose
otpSchema.index({ userId: 1, purpose: 1 });

export const OTP = mongoose.model<IOTP>('OTP', otpSchema);
