export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data: T;
  detail?: string;
  errorCode?: number;
}

export interface ApiError {
  message: string;
  errorCode?: number;
  detail?: string;
}
