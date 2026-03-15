// Type declarations for index.js — re-exports with proper types and adds Session.
type ApiRes<T = unknown> = Promise<{ status: number; data?: T; message?: string }>

export declare function register(data: unknown): ApiRes
export declare function login(data: unknown): ApiRes
export declare function auth(): ApiRes
export declare function requestResetPassword(data: unknown): ApiRes
export declare function resetPassword(data: unknown): ApiRes
export declare function editUser(data: unknown): ApiRes

export interface Session {
  id: number
  userAgent: string | null
  isCurrent: boolean
  ipAddress: string | null
  createdAt: string
}

export declare function getSessions(): ApiRes<{ sessions: Session[] }>
export declare function revokeSession(id: number | string): ApiRes

export declare function getSubscriptions(): ApiRes
export declare function getAvailablePlans(params?: { showYearly?: boolean }): ApiRes
export declare function handleSubscriptionCancellation(data: unknown): ApiRes
export declare function upgradeSubscription(data: unknown): ApiRes
export declare function uncancelSubscription(data: unknown): ApiRes
