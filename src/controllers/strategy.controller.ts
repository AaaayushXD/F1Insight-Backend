import { Request, Response, NextFunction } from 'express';
import * as mlService from '../services/ml.service';
import { Strategy } from '../models/Strategy';

export async function recommend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const mlResult = await mlService.getStrategy(req.body);

    // Store strategy result
    const strategy = await Strategy.create({
      userId: req.user!.userId,
      predictionId: req.body.predictionId || null,
      params: req.body,
      bestStrategy: mlResult.best_strategy
        ? {
            label: mlResult.best_strategy.label,
            expectedPosition: mlResult.best_strategy.expected_position,
            stdPosition: mlResult.best_strategy.std_position,
          }
        : { label: '', expectedPosition: 0, stdPosition: 0 },
      strategyRanking: mlResult.strategy_ranking || [],
      safetyCar: mlResult.safety_car_analysis || {},
      weatherImpact: mlResult.weather_impact || {},
      competitorAnalysis: mlResult.competitor_analysis || {},
      recommendations: (mlResult.tactical_recommendations || []).map(
        (r: any) => (typeof r === 'string' ? r : r.action || JSON.stringify(r))
      ),
    });

    res.json({
      success: true,
      data: {
        strategyId: strategy._id,
        bestStrategy: strategy.bestStrategy,
        strategyRanking: strategy.strategyRanking,
        safetyCarAnalysis: mlResult.safety_car_analysis,
        weatherImpact: mlResult.weather_impact,
        competitorAnalysis: mlResult.competitor_analysis,
        compoundStrategies: mlResult.compound_strategies,
        tacticalRecommendations: mlResult.tactical_recommendations,
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

    const total = await Strategy.countDocuments({ userId: req.user!.userId });
    const strategies = await Strategy.find({ userId: req.user!.userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data: { strategies },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}
