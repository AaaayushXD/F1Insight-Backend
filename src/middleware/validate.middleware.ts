import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      next(result.error);
      return;
    }

    // Only reassign body — Express 5 makes query and params read-only getters
    const data = result.data as any;
    if (data.body) {
      req.body = data.body;
    }
    next();
  };
}
