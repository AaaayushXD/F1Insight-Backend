import mongoose, { Document, Schema } from 'mongoose';

export interface IPredictionResult {
  driverId: string;
  constructorId: string;
  predictedFinishPosition: number;
  podiumProbability: number;
}

export interface IPrediction extends Document {
  userId: mongoose.Types.ObjectId;
  season: number;
  round: number;
  driverId: string | null;
  type: 'single' | 'race';
  results: IPredictionResult[];
  accuracy: {
    mae: number | null;
    correctPodium: boolean | null;
    positionsOff: number | null;
  };
  createdAt: Date;
}

const predictionResultSchema = new Schema(
  {
    driverId: { type: String, required: true },
    constructorId: { type: String, default: '' },
    predictedFinishPosition: { type: Number, required: true },
    podiumProbability: { type: Number, default: 0 },
  },
  { _id: false },
);

const predictionSchema = new Schema<IPrediction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    season: { type: Number, required: true },
    round: { type: Number, required: true },
    driverId: { type: String, default: null },
    type: {
      type: String,
      enum: ['single', 'race'],
      required: true,
    },
    results: [predictionResultSchema],
    accuracy: {
      mae: { type: Number, default: null },
      correctPodium: { type: Boolean, default: null },
      positionsOff: { type: Number, default: null },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

predictionSchema.index({ userId: 1, createdAt: -1 });
predictionSchema.index({ season: 1, round: 1 });

export const Prediction = mongoose.model<IPrediction>('Prediction', predictionSchema);
