import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message: string = 'Operation successful',
  statusCode: number = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  });
};

export const sendError = (
  res: Response,
  message: string = 'An error occurred',
  error?: string,
  statusCode: number = 400
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error || message
  });
};
