const isElectron = typeof window !== 'undefined' && (window as any).api
function call<T>(method: string, ...args: any[]): Promise<T> {
  if (isElectron) return (window as any).api[method](...args)
  return Promise.resolve(stub(method) as T)
}
function stub(m: string): any {
  const s: Record<string,any> = {
    getSettings:{id:'1',companyName:'My Business',currency:'PKR'},
    getDashboard:{totalReceivables:0,monthRevenue:0,monthExpenses:0,netProfit:0,pdcTotal:0,overdueCount:0,overdueTotal:0,outstandingInvoices:0,monthlyData:[],weeklyData:[],expByCategory:[],recentPayments:[],agingData:[]},
    getCustomers:[],getInvoices:[],getBills:[],getExpenses:[],getPDCReceivable:[],getNotifications:[],getReport:{},getAuditLogs:[],
    getNextInvoiceNumber:'INV-0001',getNextBillNumber:'BILL-0001',
    gdriveGetStatus:{connected:false},
    addCustomer:{success:true,id:'1'},updateCustomer:{success:true},deleteCustomer:{success:true},updateCustomerBalance:{success:true},
    addInvoice:{success:true,id:'1'},updateInvoice:{success:true},deleteInvoice:{success:true},recordPayment:{success:true},
    addBill:{success:true,id:'1'},updateBill:{success:true},deleteBill:{success:true},recordBillPayment:{success:true},
    addExpense:{success:true,id:'1'},updateExpense:{success:true},deleteExpense:{success:true},
    addPDCReceivable:{success:true},updatePDCReceivable:{success:true},deletePDC:{success:true},
    saveSettings:{success:true},backupDatabase:{success:true},markNotificationRead:{success:true},
    gdriveConnect:{success:false,error:'Run in Electron'},gdriveSetCode:{success:false},gdriveBackup:{success:false,error:'Run in Electron'},gdriveDisconnect:{success:true},
  }
  return s[m] ?? null
}

export const api = {
  getSettings: () => call('getSettings'),
  saveSettings: (d: any) => call('saveSettings', d),
  getDashboard: () => call('getDashboard'),
  // Customers
  getCustomers: (s?: string) => call('getCustomers', s),
  getCustomer: (id: string) => call('getCustomer', id),
  addCustomer: (d: any) => call('addCustomer', d),
  updateCustomer: (id: string, d: any) => call('updateCustomer', id, d),
  updateCustomerBalance: (id: string, balance: number) => call('updateCustomerBalance', id, balance),
  deleteCustomer: (id: string) => call('deleteCustomer', id),
  // Invoices
  getInvoices: (f?: any) => call('getInvoices', f),
  getNextInvoiceNumber: () => call('getNextInvoiceNumber'),
  addInvoice: (d: any) => call('addInvoice', d),
  updateInvoice: (id: string, d: any) => call('updateInvoice', id, d),
  deleteInvoice: (id: string) => call('deleteInvoice', id),
  recordPayment: (d: any) => call('recordPayment', d),
  // Bills
  getBills: (f?: any) => call('getBills', f),
  getNextBillNumber: () => call('getNextBillNumber'),
  addBill: (d: any) => call('addBill', d),
  updateBill: (id: string, d: any) => call('updateBill', id, d),
  deleteBill: (id: string) => call('deleteBill', id),
  recordBillPayment: (d: any) => call('recordBillPayment', d),
  // Expenses
  getExpenses: (f?: any) => call('getExpenses', f),
  addExpense: (d: any) => call('addExpense', d),
  updateExpense: (id: string, d: any) => call('updateExpense', id, d),
  deleteExpense: (id: string) => call('deleteExpense', id),
  // PDC
  getPDCReceivable: () => call('getPDCReceivable'),
  addPDCReceivable: (d: any) => call('addPDCReceivable', d),
  updatePDCReceivable: (id: string, s: string) => call('updatePDCReceivable', id, s),
  deletePDC: (id: string) => call('deletePDC', id),
  // Reports
  getReport: (p: any) => call('getReport', p),
  getAuditLogs: () => call('getAuditLogs'),
  // Notifications
  getNotifications: () => call('getNotifications'),
  markNotificationRead: (id: string) => call('markNotificationRead', id),
  // Backup
  backupDatabase: () => call('backupDatabase'),
  openFileDialog: (o?: any) => call('openFileDialog', o),
  showNotification: (d: any) => call('showNotification', d),
  // Google Drive
  gdriveGetStatus: () => call('gdriveGetStatus'),
  gdriveConnect: (creds: any) => call('gdriveConnect', creds),
  gdriveSetCode: (d: any) => call('gdriveSetCode', d),
  gdriveBackup: () => call('gdriveBackup'),
  gdriveDisconnect: () => call('gdriveDisconnect'),
}
