'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Input } from "@components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@components/ui/sheet"
import { ScrollArea } from "@components/ui/scroll-area"
import { debtors, totalDebt } from '@/lib/mock-dashboard-data'
import { ChevronDown, Search, ArrowUpDown, AlertTriangle } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

type SortKey = 'name' | 'amount' | 'dueDate'

const riskLevels = ['Low', 'Medium', 'High']

// Mock data for debtor details
const mockDebtorDetails = {
  salesHistory: [
    { id: '1', date: '2025-01-01', amount: 100 },
    { id: '2', date: '2025-01-15', amount: 150 },
    { id: '3', date: '2025-02-01', amount: 200 },
  ]
}

export default function DebtorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('dueDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedDebtor, setSelectedDebtor] = useState<typeof debtors[0] | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const sortedDebtors = [...debtors].sort((a, b) => {
    if (sortKey === 'name') {
      return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    } else if (sortKey === 'amount') {
      return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount
    } else {
      return sortOrder === 'asc' ? a.dueDate.getTime() - b.dueDate.getTime() : b.dueDate.getTime() - a.dueDate.getTime()
    }
  })

  const filteredDebtors = sortedDebtors.filter(debtor =>
    debtor.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const getRiskLevel = (amount: number) => {
    if (amount < 500) return 'Low'
    if (amount < 1000) return 'Medium'
    return 'High'
  }

  const getDebtorsChartData = () => {
    return riskLevels.map(level => ({
      risk: level,
      count: filteredDebtors.filter(d => getRiskLevel(d.amount) === level).length
    }))
  }

  const handleViewDetails = (debtor: typeof debtors[0]) => {
    setSelectedDebtor(debtor)
    setIsDrawerOpen(true)
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto py-10"
    >
      <h1 className="text-4xl font-bold mb-6">Debtors Management</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding Debt</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalDebt.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {debtors.length} active debtors
            </p>
          </CardContent>
        </Card>
        {riskLevels.map((level) => (
          <Card key={level}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{level} Risk Debtors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredDebtors.filter(d => getRiskLevel(d.amount) === level).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {((filteredDebtors.filter(d => getRiskLevel(d.amount) === level).length / filteredDebtors.length) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Debtors List</TabsTrigger>
          <TabsTrigger value="chart">Risk Analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Debtors List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search debtors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Sort by <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuCheckboxItem
                      checked={sortKey === 'name'}
                      onCheckedChange={() => handleSort('name')}
                    >
                      Name
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={sortKey === 'amount'}
                      onCheckedChange={() => handleSort('amount')}
                    >
                      Amount
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={sortKey === 'dueDate'}
                      onCheckedChange={() => handleSort('dueDate')}
                    >
                      Due Date
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Debtor</TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('amount')}>
                          Amount
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('dueDate')}>
                          Due Date
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredDebtors.map((debtor) => (
                        <motion.tr
                          key={debtor.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${debtor.name}`} />
                                <AvatarFallback>{debtor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-bold">{debtor.name}</div>
                                <div className="text-sm text-muted-foreground">ID: {debtor.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>₦{debtor.amount.toFixed(2)}</TableCell>
                          <TableCell>{format(debtor.dueDate, 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={getRiskLevel(debtor.amount) === 'Low' ? 'secondary' : getRiskLevel(debtor.amount) === 'Medium' ? 'default' : 'destructive'}>
                              {getRiskLevel(debtor.amount)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(debtor)}>View Details</Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Debtors Risk Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getDebtorsChartData()}>
                  <XAxis dataKey="risk" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Debtor Details</SheetTitle>
            <SheetDescription>
              Detailed information about the selected debtor.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
            {selectedDebtor && (
              <div className="space-y-6 mt-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${selectedDebtor.name}`} />
                    <AvatarFallback>{selectedDebtor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedDebtor.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {selectedDebtor.id}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Debt</p>
                    <p className="text-2xl font-bold">₦{selectedDebtor.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                    <p className="text-2xl font-bold">{format(selectedDebtor.dueDate, 'MMM dd, yyyy')}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2">Sales History</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockDebtorDetails.salesHistory.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{format(new Date(sale.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>₦{sale.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </motion.div>
  )
}

