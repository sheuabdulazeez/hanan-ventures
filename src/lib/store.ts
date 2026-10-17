import { getAdminSettings } from '@/database/settings'
import { getActiveSession, logoutSession } from '@/database/user'
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
    paperSize: '80mm' | '58mm';
    printerPort: string;
    printerName: string;
    printTransport: 'spooler' | 'serial';
    serialBaudRate: number;
    serialTimeoutMs: number;
    serialChunkSize: number;
    serialChunkDelayMs: number;
    serialParity: 'none' | 'odd' | 'even';
    serialStopBits: 1 | 2;
    serialDataBits: 5 | 6 | 7 | 8;
    serialFlowControl: 'none' | 'software' | 'hardware';
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
  switchActiveSale: (saleId: string) => Promise<void>
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
    paperSize: "80mm",
    printerPort: "",
    printerName: "",
    printTransport: "spooler",
    serialBaudRate: 9600,
    serialTimeoutMs: 2000,
    serialChunkSize: 1024,
    serialChunkDelayMs: 5,
    serialParity: "none",
    serialStopBits: 1,
    serialDataBits: 8,
    serialFlowControl: "none",
    footerText: '',
  },
  systemSettings: {
    currency: '',
    currencySymbol: 'N',
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
    // Only a display copy: the backend session is what authorizes anything.
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
    await logoutSession()
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
      paperSize: (settings.printer_paper_size as '80mm' | '58mm') || '80mm',
      printerPort: settings.printer_port || "",
      printerName: settings.printer_name || "",
      printTransport: (settings.printer_transport as 'spooler' | 'serial') || "spooler",
      serialBaudRate: Number(settings.serial_baud_rate || 9600),
      serialTimeoutMs: Number(settings.serial_timeout_ms || 2000),
      serialChunkSize: Number(settings.serial_chunk_size || 1024),
      serialChunkDelayMs: Number(settings.serial_chunk_delay_ms || 5),
      serialParity: (settings.serial_parity as 'none' | 'odd' | 'even') || "none",
      serialStopBits: (Number(settings.serial_stop_bits || 1) as 1 | 2),
      serialDataBits: (Number(settings.serial_data_bits || 8) as 5 | 6 | 7 | 8),
      serialFlowControl: (settings.serial_flow_control as 'none' | 'software' | 'hardware') || "none",
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
  switchActiveSale: async (saleId) => {
    set((state) => ({
      ...state,
      activeSales: state.activeSales.map((sale) => {
        if (sale.id === saleId) {
          return { ...sale, status: 'active' };
        }
        if (sale.status === 'active') {
          return { ...sale, status: 'paused' };
        }
        return sale;
      }),
    }))
    await store.set('activeSales', useAppStore.getState().activeSales)
  },
}))

// Initialize store with saved data
store.init().then(async () => {
  useAppStore.getState().setLoading(true)
  // Trust the backend, not the saved copy: after a restart there is no session and
  // the user must log in again; after a mere UI reload the session is still live.
  const savedUser = await getActiveSession()
  if (!savedUser) await store.delete('user')
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
    paperSize: (settings.printer_paper_size as '80mm' | '58mm') || '80mm',
    printerPort: settings.printer_port || "",
    printerName: settings.printer_name || "",
    printTransport: (settings.printer_transport as 'spooler' | 'serial') || "spooler",
    serialBaudRate: Number(settings.serial_baud_rate || 9600),
    serialTimeoutMs: Number(settings.serial_timeout_ms || 2000),
    serialChunkSize: Number(settings.serial_chunk_size || 1024),
    serialChunkDelayMs: Number(settings.serial_chunk_delay_ms || 5),
    serialParity: (settings.serial_parity as 'none' | 'odd' | 'even') || "none",
    serialStopBits: (Number(settings.serial_stop_bits || 1) as 1 | 2),
    serialDataBits: (Number(settings.serial_data_bits || 8) as 5 | 6 | 7 | 8),
    serialFlowControl: (settings.serial_flow_control as 'none' | 'software' | 'hardware') || "none",
  });
  useAppStore.getState().setSystemSettings({
    currency: settings.currency,
    currencySymbol: settings.currency_symbol,
    dateFormat: settings.date_format,
    timeFormat: settings.time_format,
  })
  useAppStore.getState().setLoading(false)
})
