import { Response } from 'express';

export interface StandardResponse {
  success: boolean;
  message: string;
  data: any;
  errors: any;
}

export const sendSuccess = (
  res: Response,
  message: string,
  data: any = null,
  statusCode = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    errors: null,
  });
};

export const sendError = (
  res: Response,
  message: string,
  errors: any = null,
  statusCode = 500
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors,
  });
};
