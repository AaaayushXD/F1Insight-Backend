import { Request, Response, NextFunction } from 'express';
import * as f1Service from '../services/f1.service';

export async function getSeasons(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await f1Service.getSeasons();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = parseInt(req.params.year as string);
    const data = await f1Service.getSchedule(year);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getDrivers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = parseInt(req.params.year as string);
    const data = await f1Service.getDrivers(year);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getConstructors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = parseInt(req.params.year as string);
    const data = await f1Service.getConstructors(year);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getCircuits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = parseInt(req.params.year as string);
    const data = await f1Service.getCircuits(year);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getCircuitById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await f1Service.getCircuitById(req.params.circuitId as string);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getRaceResults(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = parseInt(req.params.year as string);
    const round = parseInt(req.params.round as string);
    const data = await f1Service.getRaceResults(year, round);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getLastRaceResults(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await f1Service.getLastRaceResults();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getDriverStandings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = parseInt(req.params.year as string);
    const data = await f1Service.getDriverStandings(year);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getConstructorStandings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = parseInt(req.params.year as string);
    const data = await f1Service.getConstructorStandings(year);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
