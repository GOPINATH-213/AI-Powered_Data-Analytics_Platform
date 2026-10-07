export class BaseError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class StorageError extends BaseError {
  constructor(message: string) {
    super(message, 500);
  }
}

export class UploadError extends BaseError {
  constructor(message: string, statusCode = 400) {
    super(message, statusCode);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string) {
    super(message, 401);
  }
}
export class AuthorizationError extends BaseError {
  constructor(message: string) {
    super(message, 403);
  }
}
