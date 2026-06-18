export type ActivePage =
  | 'dashboard'
  | 'receivables'
  | 'payables'
  | 'pdc'
  | 'expenses'
  | 'reports'
  | 'analytics'
  | 'settings'

export interface Customer {
  id: string; name: string; company?: string; phone?: string; whatsapp?: string
  email?: string; address?: string; ntn?: string; creditLimit: number
  openingBalance: number; currentBalance: number; notes?: string
  createdAt: string; updatedAt: string
}

export interface Supplier {
  id: string; name: string; company?: string; phone?: string; email?: string
  address?: string; ntn?: string; currentBalance: number; openingBalance: number
  notes?: string; createdAt: string; updatedAt: string
}

export interface Invoice {
  id: string; invoiceNumber: string; customerId: string; customerName: string
  date: string; dueDate: string; amount: number; paidAmount: number
  status: string; notes?: string; createdAt: string
}

export interface Bill {
  id: string; billNumber: string; supplierId: string; supplierName: string
  date: string; dueDate: string; amount: number; paidAmount: number
  status: string; category: string; notes?: string; createdAt: string
}

export interface Expense {
  id: string; category: string; description: string; amount: number
  date: string; isRecurring: boolean; recurringPeriod?: string; notes?: string; createdAt: string
}

export interface PDCReceivable {
  id: string; customerId: string; customerName: string; checkNumber: string
  bank: string; amount: number; issueDate: string; depositDate: string
  status: string; notes?: string; createdAt: string
}

export interface PDCPayable {
  id: string; supplierId: string; supplierName: string; checkNumber: string
  bank: string; amount: number; issueDate: string; dueDate: string
  status: string; notes?: string; createdAt: string
}

export interface Notification {
  id: string; type: string; title: string; message: string; read: boolean; createdAt: string
}
