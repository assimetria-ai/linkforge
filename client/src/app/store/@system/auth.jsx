import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const TOKEN_KEY = 'app_jwt'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.user) {
          setUser(data.user)
        } else {
          localStorage.removeItem(TOKEN_KEY)
        }
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  async function login(token) {
    localStorage.setItem(TOKEN_KEY, token)
    try {
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser({ token })
      }
    } catch {
      setUser({ token })
    }
  }

  function logout() {
    const token = localStorage.getItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    if (token) {
      fetch('/api/sessions', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
