import { Response } from 'express';

/**
 * Standardized API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any[];
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Success response helper
 */
export const successResponse = <T>(
  data: T,
  meta?: { page?: number; limit?: number; total?: number }
): ApiResponse<T> => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  },
});

/**
 * Error response helper
 */
export const errorResponse = (
  message: string,
  code?: string,
  details?: any[]
): ApiResponse => ({
  success: false,
  error: {
    message,
    code,
    details,
  },
  meta: {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  },
});

/**
 * Send success response
 */
export const sendSuccess = <T>(res: Response, data: T, statusCode = 200): void => {
  res.status(statusCode).json(successResponse(data));
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  code?: string,
  details?: any[]
): void => {
  res.status(statusCode).json(errorResponse(message, code, details));
};