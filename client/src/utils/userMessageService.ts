/**
 * Centralized User-Friendly Message System
 * Converts technical errors, network failures, and backend exceptions
 * into safe, professional, user-facing error messages.
 */

export interface FriendlyError {
  message: string;
  refId?: string;
}

/**
 * Generates a unique short reference ID for debugging correlation.
 */
export function generateErrorRef(): string {
  const chars = '0123456789ABCDEF';
  let ref = 'ERR-';
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

/**
 * Maps technical error codes or strings to user-friendly messages.
 */
export function getFriendlyErrorMessage(error: any): FriendlyError {
  const refId = generateErrorRef();
  
  // Log full detailed technical error in console with correlation Reference ID for developers
  console.error(`[InsightNexus Developer Diagnostics] Reference ID: ${refId}`, error);

  let message = 'Something went wrong. Please try again. If the problem continues, contact support.';

  if (!error) {
    return { message, refId };
  }

  // Handle Axios / Network Errors
  if (error.isAxiosError || error.response || error.request) {
    const status = error.response?.status;
    const technicalMsg = error.response?.data?.message || '';

    // Check specific technical string patterns in backend error messages
    if (technicalMsg.includes('Cast to ObjectId') || technicalMsg.includes('MongooseError') || technicalMsg.includes('ValidationError')) {
      return {
        message: 'Unable to process your request due to data format constraints. Please check the information and try again.',
        refId
      };
    }

    if (status) {
      switch (status) {
        case 400:
          message = 'Unable to process your request. Please check the information and try again.';
          break;
        case 401:
          message = 'Your session has expired. Please sign in again.';
          break;
        case 403:
          message = "You don't have permission to perform this action.";
          break;
        case 404:
          message = 'The requested data could not be found.';
          break;
        case 409:
          message = 'This action conflicts with the current data. Please refresh and try again.';
          break;
        case 429:
          message = 'Too many requests. Please wait a moment and try again.';
          break;
        case 500:
          message = 'Something went wrong on our server. Please try again later.';
          break;
        default:
          message = 'An unexpected server error occurred. Please try again.';
      }
      return { message, refId };
    }

    // No response but request was sent (Network offline / server down)
    return {
      message: 'Unable to connect to the server. Please check your network connection.',
      refId
    };
  }

  // Handle generic / local JS errors
  const errStr = String(error.message || error);

  if (errStr.includes('Cast to ObjectId') || errStr.includes('ObjectId failed') || errStr.includes('Mongoose') || errStr.includes('MongoServerError')) {
    message = 'Unable to resolve the data reference. The requested item does not exist or has an invalid reference format.';
  } else if (errStr.includes('Network Error') || errStr.includes('Failed to fetch')) {
    message = 'Network connection failed. Please check your internet connection.';
  } else if (errStr.includes('Cannot read properties') || errStr.includes('undefined') || errStr.includes('TypeError')) {
    message = 'Something went wrong while processing the report layout. Please refresh the page.';
  } else if (errStr.includes('JWT') || errStr.includes('auth') || errStr.includes('token')) {
    message = 'Your session could not be verified. Please sign in again.';
  }

  return { message, refId };
}
