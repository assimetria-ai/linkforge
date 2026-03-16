// @system — Auth context: provides user, login, logout, register to the whole app
// Wrap your root component (or App) with <AuthProvider>.
// Consume with useAuthContext() in any component.

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/@system/api'

const AuthContext = createContext(null)

const DEFAULT_ONBOARDING_STATUS = {
  completed: false,
  has_brand: false,
  has_subscription: false,
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onboardingStatus, setOnboardingStatus] = useState(DEFAULT_ONBOARDING_STATUS)
  const [onboardingLoading, setOnboardingLoading] = useState(true)

  const refreshOnboardingStatus = useCallback(async (nextUser = user) => {
    if (!nextUser) {
      setOnboardingStatus(DEFAULT_ONBOARDING_STATUS)
      setOnboardingLoading(false)
      return DEFAULT_ONBOARDING_STATUS
    }

    setOnboardingLoading(true)
    try {
      const status = await api.get('/onboarding/status')
      const normalized = {
        completed: !!status.completed,
        has_brand: !!status.has_brand,
        has_subscription: !!status.has_subscription,
      }
      setOnboardingStatus(normalized)
      return normalized
    } catch {
      setOnboardingStatus(DEFAULT_ONBOARDING_STATUS)
      return DEFAULT_ONBOARDING_STATUS
    } finally {
      setOnboardingLoading(false)
    }
  }, [user])

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.get('/sessions/me')
      setUser(user)
      await refreshOnboardingStatus(user)
    } catch {
      setUser(null)
      setOnboardingStatus(DEFAULT_ONBOARDING_STATUS)
      setOnboardingLoading(false)
    }
  }, [refreshOnboardingStatus])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback(async (email, password) => {
    const { user } = await api.post('/sessions', { email, password })
    setUser(user)
    await refreshOnboardingStatus(user)
  }, [refreshOnboardingStatus])

  const register = useCallback(async (name, email, password) => {
    await api.post('/users', { name, email, password })
    await login(email, password)
  }, [login])

  const logout = useCallback(async () => {
    await api.delete('/sessions')
    setUser(null)
    setOnboardingStatus(DEFAULT_ONBOARDING_STATUS)
  }, [])

  const updateUser = useCallback(async (fields) => {
    const { user: updated } = await api.patch('/users/me', fields)
    setUser((prev) => ({ ...prev, ...updated }))
    await refreshOnboardingStatus(updated)
  }, [refreshOnboardingStatus])

  const resendVerificationEmail = useCallback(async () => {
    await api.post('/users/email/verify/request', {})
  }, [])

  const completeOnboarding = useCallback(async (data) => {
    const { user: updated } = await api.patch('/users/me', {
      onboarding_completed: true,
      ...(data?.onboarding_data ? { onboarding_data: data.onboarding_data } : {}),
    })
    setUser((prev) => ({ ...prev, ...updated, onboardingCompleted: true }))
    await refreshOnboardingStatus(updated)
  }, [refreshOnboardingStatus])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        onboardingStatus,
        onboardingLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refresh,
        refreshOnboardingStatus,
        updateUser,
        resendVerificationEmail,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(){
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>')
  return ctx
}
