'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, Calendar, CreditCard } from 'lucide-react'
import { getExpenseStats, ExpenseStats as ExpenseStatsType } from '@/database/expenses'
import { formatAmount } from '@/lib/utils'

interface ExpenseStatsProps {
  refreshTrigger?: number
}

export default function ExpenseStats({ refreshTrigger }: ExpenseStatsProps) {
  const [stats, setStats] = useState<ExpenseStatsType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [refreshTrigger])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await getExpenseStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to load expense stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const topCategory = stats.expensesByCategory[0]
  const topPaymentMethod = stats.expensesByPaymentMethod[0]
  const thisMonth = stats.monthlyExpenses[0]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              All time expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topCategory ? formatAmount(topCategory.total) : formatAmount(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {topCategory ? `${topCategory.expense_type} (${topCategory.count} items)` : 'No expenses yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {thisMonth ? formatAmount(thisMonth.total) : formatAmount(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {thisMonth ? thisMonth.month : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Payment Method</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topPaymentMethod ? formatAmount(topPaymentMethod.total) : formatAmount(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {topPaymentMethod ? `${topPaymentMethod.payment_method} (${topPaymentMethod.count} items)` : 'No expenses yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {stats.expensesByCategory.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Expenses by Category</CardTitle>
              <CardDescription>Breakdown of expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.expensesByCategory.slice(0, 5).map((category) => (
                  <div key={category.expense_type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{category.expense_type}</Badge>
                      <span className="text-sm text-muted-foreground">({category.count} items)</span>
                    </div>
                    <span className="font-medium">{formatAmount(category.total)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Methods</CardTitle>
              <CardDescription>Breakdown by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.expensesByPaymentMethod.map((method) => (
                  <div key={method.payment_method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{method.payment_method}</Badge>
                      <span className="text-sm text-muted-foreground">({method.count} items)</span>
                    </div>
                    <span className="font-medium">{formatAmount(method.total)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}