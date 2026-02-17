import { Request, Response, NextFunction } from 'express';
import * as mlService from '../services/ml.service';
import { Prediction } from '../models/Prediction';
import { Notification } from '../models/Notification';
import { ApiError } from '../utils/apiError';

export async function predictSingle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const season = parseInt(req.query.season as string);
    const round = parseInt(req.query.round as string);
    const driverId = req.query.driverId as string;

    const mlResult = await mlService.predictSingle(season, round, driverId);

    // Store prediction
    const prediction = await Prediction.create({
      userId: req.user!.userId,
      season,
      round,
      driverId,
      type: 'single',
      results: [{
        driverId,
        constructorId: mlResult.constructor_id || '',
        predictedFinishPosition: mlResult.predicted_finish_position,
        podiumProbability: mlResult.podium_probability || 0,
      }],
    });

    // Create notification
    await Notification.create({
      userId: req.user!.userId,
      type: 'prediction',
      title: 'Prediction Complete',
      message: `Predicted P${Math.round(mlResult.predicted_finish_position)} for ${driverId} in Round ${round}`,
      metadata: { predictionId: prediction._id, season, round, driverId },
    });

    res.json({
      success: true,
      data: {
        predictionId: prediction._id,
        driverId,
        predictedFinishPosition: mlResult.predicted_finish_position,
        podiumProbability: mlResult.podium_probability || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function predictRace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const season = parseInt(req.query.season as string);
    const round = parseInt(req.query.round as string);

    const mlResult = await mlService.predictRace(season, round);

    const predictions = (mlResult.predictions || []).map((p: any) => ({
      driverId: p.driver_id,
      constructorId: p.constructor_id || '',
      predictedFinishPosition: p.predicted_finish_position,
      podiumProbability: p.podium_probability || 0,
    }));

    // Store prediction
    const prediction = await Prediction.create({
      userId: req.user!.userId,
      season,
      round,
      driverId: null,
      type: 'race',
      results: predictions,
    });

    // Create notification
    await Notification.create({
      userId: req.user!.userId,
      type: 'prediction',
      title: 'Race Prediction Complete',
      message: `Full grid prediction for Round ${round}, ${season} is ready`,
      metadata: { predictionId: prediction._id, season, round },
    });

    res.json({
      success: true,
      data: {
        predictionId: prediction._id,
        season,
        round,
        predictions,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const seasonFilter = req.query.season ? { season: parseInt(req.query.season as string) } : {};

    const query = { userId: req.user!.userId, ...seasonFilter };
    const total = await Prediction.countDocuments(query);
    const predictions = await Prediction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data: { predictions },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPredictionById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const prediction = await Prediction.findOne({
      _id: req.params.id as string,
      userId: req.user!.userId,
    });

    if (!prediction) {
      throw ApiError.notFound('Prediction not found');
    }

    res.json({ success: true, data: prediction });
  } catch (error) {
    next(error);
  }
}

export async function checkMLHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const health = await mlService.checkHealth();
    res.json({ success: true, data: health });
  } catch (error) {
    next(error);
  }
}
