import mongoose, { Document, Schema } from 'mongoose';

export interface IStrategy extends Document {
  userId: mongoose.Types.ObjectId;
  predictionId: mongoose.Types.ObjectId | null;
  params: {
    predictedPositionMean: number;
    predictedPositionStd: number;
    pitLossSec: number;
    nSimulations: number;
    circuitId: string | null;
    raceLaps: number;
    trackTemp: number | null;
    airTemp: number | null;
    humidity: number | null;
    rainProbability: number;
    isWetRace: boolean;
    gapToCarAhead: number | null;
    gapToCarBehind: number | null;
  };
  bestStrategy: {
    label: string;
    expectedPosition: number;
    stdPosition: number;
  };
  strategyRanking: any[];
  safetyCar: any;
  weatherImpact: any;
  competitorAnalysis: any;
  recommendations: string[];
  createdAt: Date;
}

const strategySchema = new Schema<IStrategy>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    predictionId: {
      type: Schema.Types.ObjectId,
      ref: 'Prediction',
      default: null,
    },
    params: {
      predictedPositionMean: { type: Number, required: true },
      predictedPositionStd: { type: Number, default: 2.0 },
      pitLossSec: { type: Number, default: 22.0 },
      nSimulations: { type: Number, default: 2000 },
      circuitId: { type: String, default: null },
      raceLaps: { type: Number, default: 56 },
      trackTemp: { type: Number, default: null },
      airTemp: { type: Number, default: null },
      humidity: { type: Number, default: null },
      rainProbability: { type: Number, default: 0 },
      isWetRace: { type: Boolean, default: false },
      gapToCarAhead: { type: Number, default: null },
      gapToCarBehind: { type: Number, default: null },
    },
    bestStrategy: {
      label: { type: String, default: '' },
      expectedPosition: { type: Number, default: 0 },
      stdPosition: { type: Number, default: 0 },
    },
    strategyRanking: { type: Schema.Types.Mixed, default: [] },
    safetyCar: { type: Schema.Types.Mixed, default: {} },
    weatherImpact: { type: Schema.Types.Mixed, default: {} },
    competitorAnalysis: { type: Schema.Types.Mixed, default: {} },
    recommendations: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

strategySchema.index({ userId: 1, createdAt: -1 });

export const Strategy = mongoose.model<IStrategy>('Strategy', strategySchema);
