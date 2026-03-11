export interface ApiClient {
  get<T = any>(path: string): Promise<T>
  post<T = any>(path: string, body?: any): Promise<T>
  patch<T = any>(path: string, body?: any): Promise<T>
  delete<T = any>(path: string): Promise<T>
}

export const api: ApiClient
