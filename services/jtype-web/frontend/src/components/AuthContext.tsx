import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import {
  api,
  setToken,
  clearStoredAuth,
  setStoredUsername,
  getStoredToken,
  type AuthResponse,
} from '../api'

interface AuthState {
  user: AuthResponse | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const token = getStoredToken()
      if (!token) {
        clearStoredAuth()
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const currentUser = await api.me()
        if (cancelled) return
        setStoredUsername(currentUser.username)
        setUser(currentUser)
      } catch {
        if (!cancelled) {
          clearStoredAuth()
          setUser(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  async function login(username: string, password: string) {
    const res = await api.login(username, password)
    setToken(res.token)
    setStoredUsername(res.username)
    setUser(res)
  }

  async function register(username: string, password: string) {
    const res = await api.register(username, password)
    setToken(res.token)
    setStoredUsername(res.username)
    setUser(res)
  }

  function logout() {
    clearStoredAuth()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
