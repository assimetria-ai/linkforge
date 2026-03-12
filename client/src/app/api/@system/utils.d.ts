// Type declarations for utils.js

type ApiResponse<T = unknown> = Promise<{ status: number; data?: T; message?: string }>

export declare const apiRequest: {
  get<T = unknown>(path: string): ApiResponse<T>
  post<T = unknown>(path: string, body?: unknown): ApiResponse<T>
  postForm<T = unknown>(path: string, form: FormData): ApiResponse<T>
  patch<T = unknown>(path: string, body?: unknown): ApiResponse<T>
  put<T = unknown>(path: string, body?: unknown): ApiResponse<T>
  delete<T = unknown>(path: string): ApiResponse<T>
}
