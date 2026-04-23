import { Response, NextFunction } from 'express';

/**
 * Base application error
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
      },
    };
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, public details?: any[]) {
    super(message, 400, 'VALIDATION_ERROR');
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        details: this.details,
      },
    };
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT');
  }
}

/**
 * External API error
 */
export class ExternalApiError extends AppError {
  constructor(message: string, public externalStatus?: number) {
    super(message, 502, 'EXTERNAL_API_ERROR', false);
  }
}

/**
 * Handle API errors and send response
 */
export const handleApiError = (
  error: any,
  res: Response,
  defaultMessage: string = 'An error occurred'
): void => {
  // Handle our custom errors
  if (error instanceof AppError) {
    res.status(error.statusCode).json(error.toJSON());
    return;
  }

  // Handle axios/Riot API errors
  if (error.response) {
    const status = error.response.status;
    const apiMessage = error.response.data?.status?.message;

    if (status === 404) {
      res.status(404).json(new NotFoundError(apiMessage || 'Resource not found').toJSON());
      return;
    }

    if (status === 401) {
      res.status(401).json(new UnauthorizedError(apiMessage || 'Unauthorized').toJSON());
      return;
    }

    if (status === 403) {
      res.status(403).json(new ForbiddenError(apiMessage || 'Forbidden').toJSON());
      return;
    }

    if (status === 429) {
      res.status(429).json(new RateLimitError('Riot API rate limit exceeded').toJSON());
      return;
    }

    res.status(status).json(
      new ExternalApiError(apiMessage || defaultMessage, status).toJSON()
    );
    return;
  }

  // Handle connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    res.status(503).json(
      new ExternalApiError('External service unavailable').toJSON()
    );
    return;
  }

  // Default internal server error
  console.error('[ERROR]', error.message || error);
  res.status(500).json(new AppError(defaultMessage).toJSON());
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (
  fn: (req: any, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 */
export const errorMiddleware = (
  err: Error,
  req: any,
  res: Response,
  next: NextFunction
): void => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  handleApiError(err, res);
};