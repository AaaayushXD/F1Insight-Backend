export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: { field: string; message: string }[];

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    errors?: { field: string; message: string }[],
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, errors?: { field: string; message: string }[]) {
    return new ApiError(400, message, true, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Insufficient permissions') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message: string) {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, false);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable') {
    return new ApiError(503, message);
  }
}
