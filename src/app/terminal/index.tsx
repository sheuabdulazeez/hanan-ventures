"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Terminal,
  ShoppingCart,
  Package,
  ChevronRight,
  Plus,
  Minus,
  X,
  DollarSign,
  Calculator,
  ArrowLeft,
  ArrowRight,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ExperimentalTerminal = () => {
  const [activeMode, setActiveMode] = useState('inventory');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50/50 flex flex-col"
    >
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 h-20 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Experimental Terminal</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">V0.4.2 // Advanced Internal Module</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
            <Monitor className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Secure Environment</span>
          </div>
          <Button variant="outline" size="sm" className="h-9 px-4 border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-3.5 h-3.5 mr-2" />
            Exit Module
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-6 space-y-2">
            {[
              { id: 'inventory', label: 'Matrix Control', icon: Package },
              { id: 'terminal', label: 'Sales Interface', icon: ShoppingCart },
              { id: 'calc', label: 'Fiscal Engine', icon: Calculator },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveMode(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeMode === item.id
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-auto p-6 border-t border-slate-100">
            <Card className="bg-slate-900 border-none shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">System Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-white uppercase">Neural Core Active</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMode}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="max-w-6xl mx-auto space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    {activeMode === 'inventory' && 'Matrix Control Center'}
                    {activeMode === 'terminal' && 'Sales Synthesis Interface'}
                    {activeMode === 'calc' && 'Fiscal Computational Engine'}
                  </h2>
                  <p className="text-slate-500 font-medium mt-1">Advanced management protocols and real-time synchronization.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px]">
                    Initialize Sequence
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-slate-200 bg-white hover:shadow-xl transition-all duration-500 group">
                    <CardHeader className="p-6 pb-2">
                      <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors flex items-center justify-between">
                        Analytics Node 0{i}
                        <ArrowRight className="w-3 h-3 -rotate-45" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <p className="text-2xl font-black text-slate-900 mb-1">94.8%</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Operational Efficiency</p>
                      <div className="w-full h-1 bg-slate-100 rounded-full mt-4 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '94.8%' }}
                          className="h-full bg-slate-900"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
                <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Active Protocols</CardTitle>
                    <CardDescription className="text-xs font-bold text-slate-400 uppercase mt-1">Current system state monitoring</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input placeholder="Filter protocols..." className="pl-9 h-10 w-64 bg-slate-50 border-slate-200 text-xs font-bold" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-50">
                    {[
                      { name: 'Inventory Rebalancing', status: 'In Progress', type: 'Logistic' },
                      { name: 'Revenue Verification', status: 'Completed', type: 'Fiscal' },
                      { name: 'User Access Audit', status: 'Warning', type: 'Security' },
                    ].map((item, i) => (
                      <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-white transition-colors shadow-sm">
                            <Plus className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.type} Protocol</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-black uppercase tracking-widest px-2 h-5 ${item.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                item.status === 'Warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                  'bg-blue-50 text-blue-600 border-blue-100'
                              }`}
                          >
                            {item.status}
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-300 hover:text-slate-900">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default ExperimentalTerminal;