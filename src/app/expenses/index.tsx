'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusCircle, Search, ArrowUpDown, Receipt, CreditCard, DollarSign, Trash2, Edit } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@components/ui/card"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog"
import { Label } from "@components/ui/label"
import { ScrollArea } from "@components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select"
import { toast } from 'sonner'
import { TBusinessExpense, PaymentMethod } from '@/types/database'
import { 
  getExpenses, 
  createExpense, 
  updateExpense, 
  deleteExpense, 
  getExpenseCategories,
  CreateExpenseData,
  UpdateExpenseData 
} from '@/database/expenses'
import { formatAmount } from '@/lib/utils'
import ExpenseStats from '@/components/ExpenseStats'
import { useAppStore } from '@/lib/store'

export default function Expenses() {
  const { auth } = useAppStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<keyof TBusinessExpense>('expense_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedExpense, setSelectedExpense] = useState<TBusinessExpense | null>(null)
  const [expenses, setExpenses] = useState<TBusinessExpense[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<TBusinessExpense | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Form state
  const [formData, setFormData] = useState<CreateExpenseData>({
    expense_type: '',
    description: '',
    amount: 0,
    payment_method: 'cash' as PaymentMethod,
    bank_name: '',
    employee_id: auth.user.id
  })

  useEffect(() => {
    loadExpenses()
    loadCategories()
  }, [])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const data = await getExpenses()
      setExpenses(data)
    } catch (error) {
      console.error('Failed to load expenses:', error)
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const data = await getExpenseCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.expense_type.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    const aValue = a[sortColumn]
    const bValue = b[sortColumn]
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (column: keyof TBusinessExpense) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleCreateExpense = async () => {
    try {
      if (!formData.expense_type || !formData.description || formData.amount <= 0) {
        toast.error('Please fill in all required fields')
        return
      }

      await createExpense(formData)
      toast.success('Expense created successfully')
      setIsCreateDialogOpen(false)
      setFormData({
        expense_type: '',
        description: '',
        amount: 0,
        payment_method: 'cash' as PaymentMethod,
        bank_name: '',
        employee_id: 'default-user-id'
      })
      loadExpenses()
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Failed to create expense:', error)
      toast.error('Failed to create expense')
    }
  }

  const handleUpdateExpense = async () => {
    try {
      if (!editingExpense) return

      const updateData: UpdateExpenseData = {
        expense_type: formData.expense_type,
        description: formData.description,
        amount: formData.amount,
        payment_method: formData.payment_method,
        bank_name: formData.bank_name
      }

      await updateExpense(editingExpense.id, updateData)
      toast.success('Expense updated successfully')
      setIsEditDialogOpen(false)
      setEditingExpense(null)
      loadExpenses()
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Failed to update expense:', error)
      toast.error('Failed to update expense')
    }
  }

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense(id)
      toast.success('Expense deleted successfully')
      loadExpenses()
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Failed to delete expense:', error)
      toast.error('Failed to delete expense')
    }
  }

  const openEditDialog = (expense: TBusinessExpense) => {
    setEditingExpense(expense)
    setFormData({
      expense_type: expense.expense_type,
      description: expense.description,
      amount: expense.amount,
      payment_method: expense.payment_method,
      bank_name: expense.bank_name || '',
      employee_id: expense.employee_id
    })
    setIsEditDialogOpen(true)
  }

  const categoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'rent': return <DollarSign className="h-4 w-4 text-blue-500" />
      case 'utilities': return <CreditCard className="h-4 w-4 text-green-500" />
      case 'meals': return <Receipt className="h-4 w-4 text-yellow-500" />
      default: return <Receipt className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="container mx-auto py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ExpenseStats refreshTrigger={refreshTrigger} />

        <Card className='mt-5'>
          <CardHeader>
            <CardTitle>Manage Expenses</CardTitle>
            <CardDescription>View and create expenses for your business.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create Expense</DialogTitle>
                    <DialogDescription>
                      Fill in the details to create a new expense.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">
                        Description
                      </Label>
                      <Input 
                        id="description" 
                        className="col-span-3" 
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="amount" className="text-right">
                        Amount
                      </Label>
                      <Input 
                        id="amount" 
                        type="number" 
                        className="col-span-3" 
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="date" className="text-right">
                        Date
                      </Label>
                      <Input 
                        id="date" 
                        type="date" 
                        className="col-span-3" 
                        value={formData.expense_date ? formData.expense_date.split('T')[0] : new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="category" className="text-right">
                        Category
                      </Label>
                      <Select value={formData.expense_type} onValueChange={(value) => setFormData({...formData, expense_type: value})}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rent">Rent</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="meals">Meals</SelectItem>
                          <SelectItem value="software">Software</SelectItem>
                          <SelectItem value="office_supplies">Office Supplies</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="travel">Travel</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="payment-method" className="text-right">
                        Payment Method
                      </Label>
                      <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value as PaymentMethod})}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="pos">POS</SelectItem>
                          <SelectItem value="transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.payment_method === 'transfer' && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bank-name" className="text-right">
                          Bank Name
                        </Label>
                        <Input 
                          id="bank-name" 
                          className="col-span-3" 
                          value={formData.bank_name}
                          onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={handleCreateExpense}>
                      Create Expense
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">
                      <Button variant="ghost" onClick={() => handleSort('id')}>
                        ID
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('description')}>
                        Description
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('amount')}>
                        Amount
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('expense_date')}>
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('expense_type')}>
                        Category
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading expenses...
                        </TableCell>
                      </TableRow>
                    ) : filteredExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No expenses found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExpenses.map((expense) => (
                        <motion.tr
                          key={expense.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <TableCell className="font-medium">{expense.id.slice(0, 8)}...</TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>{formatAmount(expense.amount)}</TableCell>
                          <TableCell>{format(new Date(expense.expense_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex w-fit items-center gap-1">
                              {categoryIcon(expense.expense_type)}
                              {expense.expense_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{expense.payment_method}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedExpense(expense)}>
                                View
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(expense)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* View Expense Dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected expense.
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                <div>
                  <Label>Description</Label>
                  <div className="font-semibold">{selectedExpense.description}</div>
                </div>
                <div>
                  <Label>Amount</Label>
                  <div className="font-semibold">{formatAmount(selectedExpense.amount)}</div>
                </div>
                <div>
                  <Label>Date</Label>
                  <div>{format(new Date(selectedExpense.expense_date), 'MMMM dd, yyyy')}</div>
                </div>
                <div>
                  <Label>Category</Label>
                  <Badge variant="outline" className="flex w-fit items-center gap-1 mt-1">
                    {categoryIcon(selectedExpense.expense_type)}
                    {selectedExpense.expense_type}
                  </Badge>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <div>{selectedExpense.payment_method}</div>
                </div>
                {selectedExpense.bank_name && (
                  <div>
                    <Label>Bank Name</Label>
                    <div>{selectedExpense.bank_name}</div>
                  </div>
                )}
                <div>
                  <Label>Created</Label>
                  <div>{format(new Date(selectedExpense.created_at), 'MMMM dd, yyyy HH:mm')}</div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the expense details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Input 
                id="edit-description" 
                className="col-span-3" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-amount" className="text-right">
                Amount
              </Label>
              <Input 
                id="edit-amount" 
                type="number" 
                className="col-span-3" 
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category" className="text-right">
                Category
              </Label>
              <Select value={formData.expense_type} onValueChange={(value) => setFormData({...formData, expense_type: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="meals">Meals</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="office_supplies">Office Supplies</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-payment-method" className="text-right">
                Payment Method
              </Label>
              <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value as PaymentMethod})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                  <SelectItem value="transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.payment_method === 'transfer' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-bank-name" className="text-right">
                  Bank Name
                </Label>
                <Input 
                  id="edit-bank-name" 
                  className="col-span-3" 
                  value={formData.bank_name}
                  onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdateExpense}>
              Update Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

