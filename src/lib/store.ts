import { getAdminSettings } from '@/database/settings'
import { TSale, TUser } from '@/types/database'
import { LazyStore } from '@tauri-apps/plugin-store'
import { create } from 'zustand'
import { ActiveSale } from '@/types/sales'
import { randomString } from './utils'

interface AppState {
  activeSales: ActiveSale[]
  businessInfo: {
    name: string,
    address: string,
    city: string,
    state: string,
    zipCode: string,
    phone: string,
    email: string,
    website: string,
    logo: string,
  };
  receiptSettings: {
    footerText: string,
  };
  systemSettings: {
    currency: string,
    currencySymbol: string,
    dateFormat: string,
    timeFormat: string,
  };
  auth: {
    loading: boolean
    user: TUser | null
    isAuthenticated: boolean
  }
  setLoading: (loading: boolean) => void
  setUser: (user: TUser | null) => void
  logout: () => void
  setBusinessInfo: (businessInfo: AppState['businessInfo']) => void
  setReceiptSettings: (receiptSettings: AppState['receiptSettings']) => void
  setSystemSettings: (systemSettings: AppState['systemSettings']) => void
  reloadStore: () => void
  // sales functions
  addActiveSale: (sale: ActiveSale) => Promise<void>
  removeActiveSale: (saleId: string) => Promise<void>
  updateActiveSale: (saleId: string, updates: Partial<ActiveSale>) => Promise<void>
}

const store = new LazyStore('.store.dat')

export const useAppStore = create<AppState>((set) => ({
  activeSales: [],
  businessInfo: {
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
  },
  receiptSettings: {
    footerText: '',
  },
  systemSettings: {
    currency: '',
    currencySymbol: '',
    dateFormat: '',
    timeFormat: '',
  },
  auth: {
    loading: true,
    user: null,
    isAuthenticated: false,
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
  setBusinessInfo: (businessInfo) => {
    set((state) => ({
      ...state,
      businessInfo,
    }))
  },
  setReceiptSettings: (receiptSettings) => {
    set((state) => ({
      ...state,
      receiptSettings,
    }))
  },
  setSystemSettings: (systemSettings) => {
    set((state) => ({
      ...state,
      systemSettings,
    }))
  },
  reloadStore: async () => {
    const settings = await getAdminSettings();
    useAppStore.getState().setBusinessInfo({
      name: settings.name,
      address: settings.address,
      city: settings.city,
      state: settings.state,
      zipCode: settings.zip_code,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      logo: settings.logo,
    });
    useAppStore.getState().setReceiptSettings({
      footerText: settings.receipt_footer,
    });
    useAppStore.getState().setSystemSettings({
      currency: settings.currency,
      currencySymbol: settings.currency_symbol,
      dateFormat: settings.date_format,
      timeFormat: settings.time_format,
    })
  },
  // sales functions
  addActiveSale: async(sale) => {
    set((state) => ({
      ...state,
      activeSales: [...state.activeSales, sale],
    })) 
    await store.set('activeSales', useAppStore.getState().activeSales)
  },
  removeActiveSale: async (saleId) => {
    set((state) => ({
      ...state,
      activeSales: state.activeSales.filter((sale) => sale.id !== saleId),
    }))
    await store.set('activeSales', useAppStore.getState().activeSales)
  },
  updateActiveSale: async (saleId, updates) => {
    set((state) => ({
      ...state,
      activeSales: state.activeSales.map((sale) =>
        sale.id === saleId ? { ...sale, ...updates } : sale
      ),
    }))
    await store.set('activeSales', useAppStore.getState().activeSales)
  },
}))

// Initialize store with saved data
store.init().then(async () => {
  useAppStore.getState().setLoading(true)
  const savedUser = await store.get('user')
  const savedActiveSales: ActiveSale[] = await store.get('activeSales')
  if (savedActiveSales?.length) {
    useAppStore.getState().activeSales = savedActiveSales as ActiveSale[]
  } else {
    useAppStore.getState().activeSales = [
      {
        id: `SALE ${randomString(8)}`,
        customer: null,
        items: [],
        status: "active",
        total: 0,
      }
    ]
  }
  if (savedUser) {
    useAppStore.getState().setUser(savedUser as TUser)
  }
  const settings = await getAdminSettings();
  useAppStore.getState().setBusinessInfo({
    name: settings.name,
    address: settings.address,
    city: settings.city,
    state: settings.state,
    zipCode: settings.zip_code,
    phone: settings.phone,
    email: settings.email,
    website: settings.website,
    logo: settings.logo,
  });
  useAppStore.getState().setReceiptSettings({
    footerText: settings.receipt_footer,
  });
  useAppStore.getState().setSystemSettings({
    currency: settings.currency,
    currencySymbol: settings.currency_symbol,
    dateFormat: settings.date_format,
    timeFormat: settings.time_format,
  })
  useAppStore.getState().setLoading(false)
})