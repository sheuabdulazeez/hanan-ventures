# Expenses Management System

A comprehensive expense tracking and management system built with React, TypeScript, and Tauri.

## Features

### 📊 Expense Statistics Dashboard
- **Total Expenses**: View all-time expense totals
- **Top Category**: See which expense category has the highest spending
- **Monthly Overview**: Track current month's expenses
- **Payment Method Analysis**: Breakdown by payment methods
- **Category Breakdown**: Visual representation of expenses by category
- **Payment Method Distribution**: Analysis of spending patterns by payment method

### 💰 Expense Management
- **Create Expenses**: Add new expense records with detailed information
- **View Expenses**: Browse all expenses in a sortable, searchable table
- **Edit Expenses**: Modify existing expense records
- **Delete Expenses**: Remove expense records with confirmation
- **Search & Filter**: Find expenses by description, category, or amount
- **Sort Options**: Sort by date, amount, category, or payment method

### 🏦 Payment Method Support
- **Cash**: Direct cash payments
- **Bank Transfer**: Electronic bank transfers with bank name tracking
- **Credit Card**: Credit card payments
- **Debit Card**: Debit card transactions
- **Check**: Check payments
- **Other**: Custom payment methods

### 📋 Expense Categories
- Dynamic category management
- Automatic category suggestions
- Category-based expense analysis

## Database Schema

The expenses are stored in the `business_expenses` table with the following structure:

```sql
CREATE TABLE business_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_date TEXT NOT NULL,
    expense_type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    bank_name TEXT,
    employee_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users (id)
);
```

## API Functions

The system provides the following database functions:

### Core CRUD Operations
- `getExpenses(filters?)`: Retrieve expenses with optional filtering
- `getExpenseById(id)`: Get a specific expense by ID
- `createExpense(data)`: Create a new expense record
- `updateExpense(id, data)`: Update an existing expense
- `deleteExpense(id)`: Delete an expense record

### Analytics Functions
- `getExpenseStats()`: Get comprehensive expense statistics
- `getExpenseCategories()`: Retrieve all expense categories
- `getExpensesByDateRange(startDate, endDate)`: Get expenses within a date range
- `getRecentExpenses(limit?)`: Get recent expense records

## Usage

### Adding a New Expense
1. Click the "Add Expense" button
2. Fill in the expense details:
   - **Description**: What the expense was for
   - **Amount**: The expense amount
   - **Category**: Select or enter a category
   - **Payment Method**: Choose how it was paid
   - **Bank Name**: Required for bank transfers
   - **Date**: When the expense occurred
3. Click "Create Expense" to save

### Viewing and Managing Expenses
1. Use the search bar to find specific expenses
2. Click column headers to sort the table
3. Use the "View" button to see full expense details
4. Use the "Edit" button to modify an expense
5. Use the "Delete" button to remove an expense

### Understanding Statistics
- **Total Expenses**: Shows your overall spending
- **Top Category**: Identifies your biggest expense area
- **This Month**: Tracks current month's spending
- **Top Payment Method**: Shows your preferred payment method
- **Category Breakdown**: Lists top 5 categories with totals
- **Payment Methods**: Shows distribution across payment types

## File Structure

```
src/
├── app/expenses/
│   └── index.tsx              # Main expenses page component
├── components/
│   └── ExpenseStats.tsx       # Statistics dashboard component
├── database/
│   └── expenses.ts            # Database functions and types
└── types/
    └── database.ts            # TypeScript type definitions
```

## Components

### ExpenseStats Component
Displays comprehensive expense analytics including:
- Summary cards with key metrics
- Category breakdown charts
- Payment method distribution
- Monthly trends

### Expenses Page Component
Main interface featuring:
- Statistics dashboard
- Expense table with sorting and filtering
- Create/Edit/Delete dialogs
- Search and filter controls

## Error Handling

The system includes comprehensive error handling:
- Database operation errors are caught and displayed as toast notifications
- Form validation prevents invalid data entry
- Loading states provide user feedback during operations
- Confirmation dialogs prevent accidental deletions

## Performance Features

- **Lazy Loading**: Components load data only when needed
- **Optimistic Updates**: UI updates immediately for better UX
- **Efficient Queries**: Database queries are optimized for performance
- **Caching**: Statistics are cached and refreshed when data changes

## Future Enhancements

- **Export Functionality**: Export expenses to CSV/PDF
- **Recurring Expenses**: Support for recurring expense entries
- **Budget Tracking**: Set and monitor expense budgets
- **Receipt Attachments**: Attach receipt images to expenses
- **Advanced Reporting**: More detailed analytics and reports
- **Multi-currency Support**: Handle expenses in different currencies