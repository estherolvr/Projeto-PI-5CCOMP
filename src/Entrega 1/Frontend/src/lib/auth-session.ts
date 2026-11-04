export const AUTH_TOKEN_KEY = 'asaia_auth_token'
export const AUTH_SESSION_CHANGED_EVENT = 'asaia-auth-session-changed'

export function getAuthToken(): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string): void {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT))
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT))
}
