import { ApiError } from '../../src/utils/apiError';

describe('ApiError', () => {
  it('creates a bad request error', () => {
    const error = ApiError.badRequest('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid input');
    expect(error.isOperational).toBe(true);
  });

  it('creates an unauthorized error', () => {
    const error = ApiError.unauthorized();
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Unauthorized');
  });

  it('creates a forbidden error', () => {
    const error = ApiError.forbidden();
    expect(error.statusCode).toBe(403);
  });

  it('creates a not found error', () => {
    const error = ApiError.notFound('User not found');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('User not found');
  });

  it('creates a conflict error', () => {
    const error = ApiError.conflict('Email already exists');
    expect(error.statusCode).toBe(409);
  });

  it('creates an internal error (non-operational)', () => {
    const error = ApiError.internal();
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(false);
  });

  it('includes field-level validation errors', () => {
    const errors = [{ field: 'email', message: 'Invalid format' }];
    const error = ApiError.badRequest('Validation failed', errors);
    expect(error.errors).toEqual(errors);
  });

  it('is an instance of Error', () => {
    const error = ApiError.badRequest('test');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof ApiError).toBe(true);
  });
});
