import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '../lib/mock-data'

export type Theme = 'light' | 'dark'

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  department?: string
  ra?: string
  course?: string
  semester?: number
  period?: string
  phone?: string
  status?: string
}

interface AppState {
  // Theme
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void

  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void

  // Authenticated User & Active Role
  activeRole: UserRole
  setActiveRole: (role: UserRole) => void
  currentUser: CurrentUser | null
  setCurrentUser: (user: CurrentUser | null) => void
  logout: () => void

  // Notifications
  notificationCount: number
  setNotificationCount: (n: number) => void

  // Mobile drawer
  mobileMenuOpen: boolean
  setMobileMenuOpen: (v: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: next })
        if (next === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },
      setTheme: (theme) => {
        set({ theme })
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      sidebarCollapsed: false,
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      activeRole: 'aluno',
      setActiveRole: (role) => set({ activeRole: role }),

      currentUser: null,
      setCurrentUser: (user) => {
        set({
          currentUser: user,
          activeRole: user?.role || 'aluno',
        })
      },
      logout: () => {
        localStorage.removeItem('asaia_auth_token')
        set({ currentUser: null, activeRole: 'aluno' })
      },

      notificationCount: 3,
      setNotificationCount: (n) => set({ notificationCount: n }),

      mobileMenuOpen: false,
      setMobileMenuOpen: (v) => set({ mobileMenuOpen: v }),
    }),
    {
      name: 'asaia-app-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        activeRole: state.activeRole,
        currentUser: state.currentUser,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },
    }
  )
)
