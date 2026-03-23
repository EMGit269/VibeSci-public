import { NextResponse } from 'next/server';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function createSuccessResponse<T = any>(data: T, status: number = 200): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data
  };
  return NextResponse.json(response, { status });
}

export function createErrorResponse(error: string, status: number = 400): NextResponse {
  const response: ApiResponse = {
    success: false,
    error
  };
  return NextResponse.json(response, { status });
}

export function createMessageResponse(message: string, status: number = 200): NextResponse {
  const response: ApiResponse = {
    success: true,
    message
  };
  return NextResponse.json(response, { status });
}

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};