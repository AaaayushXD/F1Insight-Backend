import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'user' | 'moderator' | 'admin';
  isVerified: boolean;
  name: string;
  avatar: string | null;
  favoriteDriver: string | null;
  favoriteTeam: string | null;
  preferences: {
    theme: 'dark' | 'light' | 'system';
    raceAlerts: boolean;
    qualifyingAlerts: boolean;
    predictionAlerts: boolean;
    driverNewsAlerts: boolean;
    twoFactorEnabled: boolean;
    sessionTimeout: number;
  };
  lastLogin: Date | null;
  loginCount: number;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // exclude from queries by default
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    favoriteDriver: {
      type: String,
      default: null,
    },
    favoriteTeam: {
      type: String,
      default: null,
    },
    preferences: {
      theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
      raceAlerts: { type: Boolean, default: true },
      qualifyingAlerts: { type: Boolean, default: true },
      predictionAlerts: { type: Boolean, default: true },
      driverNewsAlerts: { type: Boolean, default: false },
      twoFactorEnabled: { type: Boolean, default: false },
      sessionTimeout: { type: Number, default: 30 },
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ role: 1 });
userSchema.index({ isDeleted: 1 });

// Exclude soft-deleted users from default queries
userSchema.pre('find', function () {
  if ((this as any).getFilter().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

userSchema.pre('findOne', function () {
  if ((this as any).getFilter().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

export const User = mongoose.model<IUser>('User', userSchema);
