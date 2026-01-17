import { create } from 'zustand';

// Data Types
export interface MetricsData {
  totalRevenue: number;
  revenueChange: number;
  activeUsers: number;
  userChange: number;
  salesCount: number;
  salesChange: number;
  conversionRate: number;
  conversionChange: number;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface TableData {
  id: string;
  [key: string]: any;
}

// Store Interface
export interface DashboardStore {
  // UI state
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  
  // Data state
  metrics: MetricsData | null;
  charts: ChartData[];
  tables: TableData[];
  
  // Methods
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  updateMetrics: (metrics: MetricsData) => void;
  updateCharts: (charts: ChartData[]) => void;
  updateTables: (tables: TableData[]) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Initial UI state
  sidebarCollapsed: false,
  theme: 'light',
  
  // Initial Data state
  metrics: null,
  charts: [],
  tables: [],
  
  // Methods
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTheme: (theme) => {
    // Also update the DOM for tailwind dark mode
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },
  updateMetrics: (metrics) => set({ metrics }),
  updateCharts: (charts) => set({ charts }),
  updateTables: (tables) => set({ tables }),
}));
