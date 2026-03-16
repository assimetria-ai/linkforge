// Type declarations for utils.js — adds generics to apiRequest methods.
type ApiResponse<T> = { status: number; data?: T; message?: string }

export declare const apiRequest: {
  get<T = unknown>(path: string): Promise<ApiResponse<T>>
  post<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>>
  postForm<T = unknown>(path: string, form: FormData): Promise<ApiResponse<T>>
  patch<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>>
  put<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>>
  delete<T = unknown>(path: string): Promise<ApiResponse<T>>
}
