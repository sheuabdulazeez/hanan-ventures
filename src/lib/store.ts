import { TUser } from '@/types/database'
import { LazyStore } from '@tauri-apps/plugin-store'
import { create } from 'zustand'



interface AppState {
  auth: {
    loading: boolean
    user: TUser | null
    isAuthenticated: boolean
  }
  sales: {
    dailySales: number
    weeklySales: number
    monthlySales: number
  }
  setLoading: (loading: boolean) => void
  setUser: (user: TUser | null) => void
  setSales: (sales: { daily: number; weekly: number; monthly: number }) => void
  logout: () => void
}

const store = new LazyStore('.store.dat')

export const useAppStore = create<AppState>((set) => ({
  auth: {
    loading: true,
    user: null,
    isAuthenticated: false,
  },
  sales: {
    dailySales: 0,
    weeklySales: 0,
    monthlySales: 0,
  },
  setUser: async (user) => {
    set((state) => ({
      auth: {
        ...state.auth,
        user,
        isAuthenticated: !!user,
      },
    }))
    await store.set('user', user)
  },
  setLoading: (loading) => {
    set((state) => ({
      auth: {
        ...state.auth,
        loading,
      },
    }))
  },
  setSales: (sales) => {
    set((state) => ({
      ...state,
      sales: {
        dailySales: sales.daily,
        weeklySales: sales.weekly,
        monthlySales: sales.monthly,
      },
    }))
  },
  logout: async () => {
    await store.delete('user')
    set((state) => ({
      auth: {
        ...state.auth,
        user: null,
        isAuthenticated: false,
      },
    }))
  },
}))

// Initialize store with saved data
store.init().then(async () => {
  useAppStore.getState().setLoading(true)
  const savedUser = await store.get('user')
  if (savedUser) {
    useAppStore.getState().setUser(savedUser as TUser)
  }
  useAppStore.getState().setLoading(false)
})