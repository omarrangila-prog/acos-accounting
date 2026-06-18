const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let db = null

function getDbPath() {
  return path.join(app.getPath('userData'), 'acos.db')
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6)
}

function initDatabase() {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDbPath()
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    createTables()
    seedDefaults()
    console.log('DB ready:', dbPath)
  } catch (err) {
    console.error('DB init error:', err)
  }
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS AppSettings (
      id TEXT PRIMARY KEY DEFAULT '1',
      companyName TEXT DEFAULT 'My Business',
      address TEXT, phone TEXT, email TEXT, ntn TEXT,
      currency TEXT DEFAULT 'PKR',
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS Customer (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT, phone TEXT, whatsapp TEXT, email TEXT,
      address TEXT, ntn TEXT,
      creditLimit REAL DEFAULT 0,
      openingBalance REAL DEFAULT 0,
      currentBalance REAL DEFAULT 0,
      notes TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS Invoice (
      id TEXT PRIMARY KEY,
      invoiceNumber TEXT UNIQUE,
      customerId TEXT NOT NULL,
      date TEXT, dueDate TEXT,
      amount REAL DEFAULT 0,
      paidAmount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      notes TEXT, items TEXT,
      currency TEXT DEFAULT 'PKR',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customerId) REFERENCES Customer(id)
    );
    CREATE TABLE IF NOT EXISTS Payment (
      id TEXT PRIMARY KEY,
      invoiceId TEXT NOT NULL,
      customerId TEXT NOT NULL,
      amount REAL DEFAULT 0,
      date TEXT, method TEXT DEFAULT 'cash',
      reference TEXT, notes TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (invoiceId) REFERENCES Invoice(id),
      FOREIGN KEY (customerId) REFERENCES Customer(id)
    );
    CREATE TABLE IF NOT EXISTS Bill (
      id TEXT PRIMARY KEY,
      billNumber TEXT UNIQUE,
      vendorName TEXT,
      date TEXT, dueDate TEXT,
      amount REAL DEFAULT 0,
      paidAmount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      category TEXT DEFAULT 'general',
      notes TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS BillPayment (
      id TEXT PRIMARY KEY,
      billId TEXT NOT NULL,
      amount REAL DEFAULT 0,
      date TEXT, method TEXT DEFAULT 'cash',
      reference TEXT, notes TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (billId) REFERENCES Bill(id)
    );
    CREATE TABLE IF NOT EXISTS PDCReceivable (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      checkNumber TEXT, bank TEXT,
      amount REAL DEFAULT 0,
      issueDate TEXT, depositDate TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customerId) REFERENCES Customer(id)
    );
    CREATE TABLE IF NOT EXISTS Expense (
      id TEXT PRIMARY KEY,
      category TEXT, description TEXT,
      amount REAL DEFAULT 0,
      date TEXT, notes TEXT,
      isRecurring INTEGER DEFAULT 0,
      recurringPeriod TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS Transaction (
      id TEXT PRIMARY KEY,
      type TEXT, referenceId TEXT,
      description TEXT, amount REAL DEFAULT 0,
      date TEXT, category TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS AuditLog (
      id TEXT PRIMARY KEY,
      action TEXT, entity TEXT, entityId TEXT,
      changes TEXT,
      timestamp TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS Notification (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'info',
      title TEXT, message TEXT,
      read INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS Counter (
      id TEXT PRIMARY KEY,
      lastInvoice INTEGER DEFAULT 0,
      lastBill INTEGER DEFAULT 0
    );
  `)
}

function seedDefaults() {
  const s = db.prepare('SELECT id FROM AppSettings WHERE id=?').get('1')
  if (!s) db.prepare(`INSERT INTO AppSettings (id, companyName, currency, updatedAt) VALUES ('1','My Business','PKR',datetime('now'))`).run()
  const c = db.prepare('SELECT id FROM Counter WHERE id=?').get('1')
  if (!c) db.prepare(`INSERT INTO Counter (id, lastInvoice, lastBill) VALUES ('1', 0, 0)`).run()
}

function logAudit(action, entity, entityId, changes) {
  try { db.prepare(`INSERT INTO AuditLog (id,action,entity,entityId,changes,timestamp) VALUES (?,?,?,?,?,datetime('now'))`).run(generateId(), action, entity, entityId, changes ? JSON.stringify(changes) : null) } catch {}
}

function updateOverdue() {
  const now = new Date().toISOString().split('T')[0]
  db.prepare(`UPDATE Invoice SET status='overdue',updatedAt=datetime('now') WHERE status IN ('pending','sent') AND dueDate < ? AND paidAmount < amount`).run(now)
  db.prepare(`UPDATE Bill SET status='overdue',updatedAt=datetime('now') WHERE status='pending' AND dueDate < ? AND paidAmount < amount`).run(now)
}

// ─── SETTINGS ────────────────────────────────────────────────
ipcMain.handle('get-settings', () => db.prepare('SELECT * FROM AppSettings WHERE id=?').get('1') || {})
ipcMain.handle('save-settings', (_, d) => {
  db.prepare(`UPDATE AppSettings SET companyName=?,address=?,phone=?,email=?,ntn=?,currency=?,updatedAt=datetime('now') WHERE id='1'`).run(d.companyName, d.address||null, d.phone||null, d.email||null, d.ntn||null, d.currency||'PKR')
  logAudit('UPDATE','Settings','1',d)
  return { success: true }
})

// ─── DASHBOARD ───────────────────────────────────────────────
ipcMain.handle('get-dashboard', () => {
  updateOverdue()
  const now = new Date()
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const mEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59).toISOString()

  const totalReceivables = db.prepare(`SELECT COALESCE(SUM(currentBalance),0) as v FROM Customer WHERE currentBalance > 0`).get().v
  const monthRevenue  = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM Payment WHERE date BETWEEN ? AND ?`).get(mStart, mEnd).v
  const monthExpenses = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM Expense WHERE date BETWEEN ? AND ?`).get(mStart, mEnd).v
  const overdueInv    = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(amount-paidAmount),0) as t FROM Invoice WHERE status='overdue'`).get()
  const pdcTotal      = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM PDCReceivable WHERE status IN ('pending','deposited')`).get().v

  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
    const s = d.toISOString().split('T')[0]
    const e = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0]
    const rev = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM Payment WHERE date BETWEEN ? AND ?`).get(s, e).v
    const exp = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM Expense WHERE date BETWEEN ? AND ?`).get(s, e).v
    monthlyData.push({ label: d.toLocaleString('en',{month:'short'}), revenue: rev, expenses: exp, profit: rev-exp })
  }

  const weeklyData = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate()-i)
    const s = d.toISOString().split('T')[0]
    const rev = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM Payment WHERE date LIKE ?`).get(s+'%').v
    const exp = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM Expense WHERE date LIKE ?`).get(s+'%').v
    weeklyData.push({ label: d.toLocaleString('en',{weekday:'short'}), revenue: rev, expenses: exp, profit: rev-exp })
  }

  const expByCategory = db.prepare(`SELECT category, COALESCE(SUM(amount),0) as total FROM Expense GROUP BY category ORDER BY total DESC LIMIT 6`).all()
  const recentPayments = db.prepare(`SELECT p.id,p.amount,p.date,p.method,c.name as customerName,i.invoiceNumber FROM Payment p JOIN Customer c ON p.customerId=c.id JOIN Invoice i ON p.invoiceId=i.id ORDER BY p.createdAt DESC LIMIT 8`).all()

  const agingData = [{label:'Current',amount:0,count:0},{label:'1-30 days',amount:0,count:0},{label:'31-60 days',amount:0,count:0},{label:'60+ days',amount:0,count:0}]
  db.prepare(`SELECT amount-paidAmount as bal, dueDate FROM Invoice WHERE status IN ('overdue','partial') AND paidAmount < amount`).all().forEach(r => {
    const days = Math.floor((now-new Date(r.dueDate))/86400000)
    const b = r.bal
    if (days<=0){agingData[0].amount+=b;agingData[0].count++}
    else if(days<=30){agingData[1].amount+=b;agingData[1].count++}
    else if(days<=60){agingData[2].amount+=b;agingData[2].count++}
    else{agingData[3].amount+=b;agingData[3].count++}
  })

  return { totalReceivables, monthRevenue, monthExpenses, netProfit: monthRevenue-monthExpenses, pdcTotal, overdueCount: overdueInv.c, overdueTotal: overdueInv.t, outstandingInvoices: db.prepare(`SELECT COUNT(*) as c FROM Invoice WHERE status NOT IN ('paid','cancelled')`).get().c, monthlyData, weeklyData, expByCategory, recentPayments, agingData }
})

// ─── CUSTOMERS ───────────────────────────────────────────────
ipcMain.handle('get-customers', (_, search) => {
  if (search) return db.prepare(`SELECT * FROM Customer WHERE name LIKE ? OR company LIKE ? OR phone LIKE ? ORDER BY name`).all(`%${search}%`,`%${search}%`,`%${search}%`)
  return db.prepare(`SELECT * FROM Customer ORDER BY name`).all()
})

ipcMain.handle('get-customer', (_, id) => {
  const customer = db.prepare(`SELECT * FROM Customer WHERE id=?`).get(id)
  const invoices = db.prepare(`SELECT * FROM Invoice WHERE customerId=? ORDER BY date DESC`).all(id)
  const payments = db.prepare(`SELECT * FROM Payment WHERE customerId=? ORDER BY date DESC`).all(id)
  const pdcs = db.prepare(`SELECT * FROM PDCReceivable WHERE customerId=? ORDER BY depositDate DESC`).all(id)
  return { customer, invoices, payments, pdcs }
})

ipcMain.handle('add-customer', (_, d) => {
  const id = generateId()
  const bal = Number(d.openingBalance)||0
  db.prepare(`INSERT INTO Customer (id,name,company,phone,whatsapp,email,address,ntn,creditLimit,openingBalance,currentBalance,notes,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(id,d.name,d.company||null,d.phone||null,d.whatsapp||null,d.email||null,d.address||null,d.ntn||null,Number(d.creditLimit)||0,bal,bal,d.notes||null)
  logAudit('CREATE','Customer',id,d)
  return { success: true, id }
})

ipcMain.handle('update-customer', (_, { id, data: d }) => {
  db.prepare(`UPDATE Customer SET name=?,company=?,phone=?,whatsapp=?,email=?,address=?,ntn=?,creditLimit=?,notes=?,updatedAt=datetime('now') WHERE id=?`).run(d.name,d.company||null,d.phone||null,d.whatsapp||null,d.email||null,d.address||null,d.ntn||null,Number(d.creditLimit)||0,d.notes||null,id)
  logAudit('UPDATE','Customer',id,d)
  return { success: true }
})

ipcMain.handle('update-customer-balance', (_, { id, balance }) => {
  db.prepare(`UPDATE Customer SET currentBalance=?,updatedAt=datetime('now') WHERE id=?`).run(Number(balance),id)
  logAudit('UPDATE','CustomerBalance',id,{balance})
  return { success: true }
})

ipcMain.handle('delete-customer', (_, id) => {
  const invCount = db.prepare(`SELECT COUNT(*) as c FROM Invoice WHERE customerId=?`).get(id).c
  if (invCount > 0) return { success: false, error: 'Customer has existing invoices. Delete invoices first.' }
  db.prepare(`DELETE FROM PDCReceivable WHERE customerId=?`).run(id)
  db.prepare(`DELETE FROM Customer WHERE id=?`).run(id)
  logAudit('DELETE','Customer',id,null)
  return { success: true }
})

// ─── INVOICES ────────────────────────────────────────────────
ipcMain.handle('get-invoices', (_, { search, status, customerId } = {}) => {
  updateOverdue()
  let q = `SELECT i.*,c.name as customerName,c.phone as customerPhone,c.address as customerAddress,c.ntn as customerNTN FROM Invoice i JOIN Customer c ON i.customerId=c.id WHERE 1=1`
  const p = []
  if (search) { q+=` AND (i.invoiceNumber LIKE ? OR c.name LIKE ?)`; p.push(`%${search}%`,`%${search}%`) }
  if (status) { q+=` AND i.status=?`; p.push(status) }
  if (customerId) { q+=` AND i.customerId=?`; p.push(customerId) }
  q+=` ORDER BY i.createdAt DESC`
  return db.prepare(q).all(...p)
})

ipcMain.handle('get-next-invoice-number', () => {
  const row = db.prepare(`SELECT lastInvoice FROM Counter WHERE id='1'`).get()
  const next = (row?.lastInvoice||0)+1
  return `INV-${String(next).padStart(4,'0')}`
})

ipcMain.handle('add-invoice', (_, d) => {
  const id = generateId()
  db.prepare(`UPDATE Counter SET lastInvoice=lastInvoice+1 WHERE id='1'`).run()
  const invNum = d.invoiceNumber || (() => { const r=db.prepare(`SELECT lastInvoice FROM Counter WHERE id='1'`).get(); return `INV-${String(r.lastInvoice).padStart(4,'0')}` })()
  db.prepare(`INSERT INTO Invoice (id,invoiceNumber,customerId,date,dueDate,amount,paidAmount,status,notes,items,currency,createdAt,updatedAt) VALUES (?,?,?,?,?,?,0,?,?,?,?,datetime('now'),datetime('now'))`).run(id,invNum,d.customerId,d.date,d.dueDate||null,Number(d.amount),d.status||'pending',d.notes||null,d.items||null,d.currency||'PKR')
  if (d.status !== 'draft') db.prepare(`UPDATE Customer SET currentBalance=currentBalance+?,updatedAt=datetime('now') WHERE id=?`).run(Number(d.amount),d.customerId)
  logAudit('CREATE','Invoice',id,d)
  return { success: true, id }
})

ipcMain.handle('update-invoice', (_, { id, data: d }) => {
  const old = db.prepare(`SELECT * FROM Invoice WHERE id=?`).get(id)
  db.prepare(`UPDATE Invoice SET invoiceNumber=?,date=?,dueDate=?,amount=?,status=?,notes=?,items=?,updatedAt=datetime('now') WHERE id=?`).run(d.invoiceNumber,d.date,d.dueDate||null,Number(d.amount),d.status,d.notes||null,d.items||null,id)
  if (old && old.status!=='draft' && d.status!=='draft') {
    const diff = Number(d.amount)-old.amount
    if (diff!==0) db.prepare(`UPDATE Customer SET currentBalance=currentBalance+?,updatedAt=datetime('now') WHERE id=?`).run(diff,old.customerId)
  }
  logAudit('UPDATE','Invoice',id,d)
  return { success: true }
})

ipcMain.handle('delete-invoice', (_, id) => {
  const inv = db.prepare(`SELECT * FROM Invoice WHERE id=?`).get(id)
  if (inv && inv.status!=='draft') {
    const remaining = inv.amount - inv.paidAmount
    if (remaining > 0) db.prepare(`UPDATE Customer SET currentBalance=currentBalance-?,updatedAt=datetime('now') WHERE id=?`).run(remaining, inv.customerId)
  }
  db.prepare(`DELETE FROM Payment WHERE invoiceId=?`).run(id)
  db.prepare(`DELETE FROM Invoice WHERE id=?`).run(id)
  logAudit('DELETE','Invoice',id,null)
  return { success: true }
})

ipcMain.handle('record-payment', (_, d) => {
  const inv = db.prepare(`SELECT * FROM Invoice WHERE id=?`).get(d.invoiceId)
  if (!inv) return { success: false, error: 'Invoice not found' }
  const newPaid = inv.paidAmount + Number(d.amount)
  const newStatus = newPaid >= inv.amount ? 'paid' : newPaid > 0 ? 'partial' : inv.status
  const pid = generateId()
  db.prepare(`INSERT INTO Payment (id,invoiceId,customerId,amount,date,method,reference,notes,createdAt) VALUES (?,?,?,?,?,?,?,?,datetime('now'))`).run(pid,d.invoiceId,inv.customerId,Number(d.amount),d.date,d.method||'cash',d.reference||null,d.notes||null)
  db.prepare(`UPDATE Invoice SET paidAmount=?,status=?,updatedAt=datetime('now') WHERE id=?`).run(newPaid,newStatus,d.invoiceId)
  db.prepare(`UPDATE Customer SET currentBalance=currentBalance-?,updatedAt=datetime('now') WHERE id=?`).run(Number(d.amount),inv.customerId)
  db.prepare(`INSERT INTO Transaction (id,type,referenceId,description,amount,date,createdAt) VALUES (?,?,?,?,?,?,datetime('now'))`).run(generateId(),'receipt',d.invoiceId,`Payment for ${inv.invoiceNumber}`,Number(d.amount),d.date)
  logAudit('PAYMENT','Invoice',d.invoiceId,d)
  return { success: true, id: pid }
})

// ─── BILLS (no supplier, just vendor name) ───────────────────
ipcMain.handle('get-bills', (_, { search, status } = {}) => {
  updateOverdue()
  let q = `SELECT * FROM Bill WHERE 1=1`
  const p = []
  if (search) { q+=` AND (billNumber LIKE ? OR vendorName LIKE ?)`; p.push(`%${search}%`,`%${search}%`) }
  if (status) { q+=` AND status=?`; p.push(status) }
  q+=` ORDER BY createdAt DESC`
  return db.prepare(q).all(...p)
})

ipcMain.handle('get-next-bill-number', () => {
  const row = db.prepare(`SELECT lastBill FROM Counter WHERE id='1'`).get()
  return `BILL-${String((row?.lastBill||0)+1).padStart(4,'0')}`
})

ipcMain.handle('add-bill', (_, d) => {
  const id = generateId()
  db.prepare(`UPDATE Counter SET lastBill=lastBill+1 WHERE id='1'`).run()
  const bNum = d.billNumber || (() => { const r=db.prepare(`SELECT lastBill FROM Counter WHERE id='1'`).get(); return `BILL-${String(r.lastBill).padStart(4,'0')}` })()
  db.prepare(`INSERT INTO Bill (id,billNumber,vendorName,date,dueDate,amount,paidAmount,status,category,notes,createdAt,updatedAt) VALUES (?,?,?,?,?,?,0,?,?,?,datetime('now'),datetime('now'))`).run(id,bNum,d.vendorName||'',d.date,d.dueDate||null,Number(d.amount),d.status||'pending',d.category||'general',d.notes||null)
  logAudit('CREATE','Bill',id,d)
  return { success: true, id }
})

ipcMain.handle('update-bill', (_, { id, data: d }) => {
  db.prepare(`UPDATE Bill SET billNumber=?,vendorName=?,date=?,dueDate=?,amount=?,category=?,notes=?,updatedAt=datetime('now') WHERE id=?`).run(d.billNumber,d.vendorName||'',d.date,d.dueDate||null,Number(d.amount),d.category||'general',d.notes||null,id)
  logAudit('UPDATE','Bill',id,d)
  return { success: true }
})

ipcMain.handle('delete-bill', (_, id) => {
  db.prepare(`DELETE FROM BillPayment WHERE billId=?`).run(id)
  db.prepare(`DELETE FROM Bill WHERE id=?`).run(id)
  logAudit('DELETE','Bill',id,null)
  return { success: true }
})

ipcMain.handle('record-bill-payment', (_, d) => {
  const bill = db.prepare(`SELECT * FROM Bill WHERE id=?`).get(d.billId)
  if (!bill) return { success: false, error: 'Bill not found' }
  const newPaid = bill.paidAmount + Number(d.amount)
  const newStatus = newPaid >= bill.amount ? 'paid' : 'partial'
  db.prepare(`INSERT INTO BillPayment (id,billId,amount,date,method,reference,notes,createdAt) VALUES (?,?,?,?,?,?,?,datetime('now'))`).run(generateId(),d.billId,Number(d.amount),d.date,d.method||'cash',d.reference||null,d.notes||null)
  db.prepare(`UPDATE Bill SET paidAmount=?,status=?,updatedAt=datetime('now') WHERE id=?`).run(newPaid,newStatus,d.billId)
  logAudit('PAYMENT','Bill',d.billId,d)
  return { success: true }
})

// ─── PDC (receivable only) ───────────────────────────────────
ipcMain.handle('get-pdc-receivable', () => db.prepare(`SELECT p.*,c.name as customerName FROM PDCReceivable p JOIN Customer c ON p.customerId=c.id ORDER BY p.depositDate`).all())

ipcMain.handle('add-pdc-receivable', (_, d) => {
  const id = generateId()
  db.prepare(`INSERT INTO PDCReceivable (id,customerId,checkNumber,bank,amount,issueDate,depositDate,status,notes,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,'pending',?,datetime('now'),datetime('now'))`).run(id,d.customerId,d.checkNumber||'',d.bank||'',Number(d.amount),d.issueDate||null,d.depositDate,d.notes||null)
  logAudit('CREATE','PDCReceivable',id,d)
  return { success: true, id }
})

ipcMain.handle('update-pdc-receivable', (_, { id, status }) => {
  db.prepare(`UPDATE PDCReceivable SET status=?,updatedAt=datetime('now') WHERE id=?`).run(status,id)
  if (status==='cleared') {
    const pdc = db.prepare(`SELECT * FROM PDCReceivable WHERE id=?`).get(id)
    if (pdc) db.prepare(`UPDATE Customer SET currentBalance=currentBalance-?,updatedAt=datetime('now') WHERE id=?`).run(pdc.amount,pdc.customerId)
  }
  logAudit('UPDATE','PDCReceivable',id,{status})
  return { success: true }
})

ipcMain.handle('delete-pdc', (_, id) => {
  db.prepare(`DELETE FROM PDCReceivable WHERE id=?`).run(id)
  logAudit('DELETE','PDCReceivable',id,null)
  return { success: true }
})

// ─── EXPENSES ────────────────────────────────────────────────
ipcMain.handle('get-expenses', (_, { search, category, dateFrom, dateTo } = {}) => {
  let q = `SELECT * FROM Expense WHERE 1=1`
  const p = []
  if (search)   { q+=` AND (description LIKE ? OR category LIKE ?)`; p.push(`%${search}%`,`%${search}%`) }
  if (category) { q+=` AND category=?`; p.push(category) }
  if (dateFrom) { q+=` AND date >= ?`; p.push(dateFrom) }
  if (dateTo)   { q+=` AND date <= ?`; p.push(dateTo) }
  q+=` ORDER BY date DESC`
  return db.prepare(q).all(...p)
})

ipcMain.handle('add-expense', (_, d) => {
  const id = generateId()
  db.prepare(`INSERT INTO Expense (id,category,description,amount,date,notes,isRecurring,recurringPeriod,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(id,d.category,d.description,Number(d.amount),d.date,d.notes||null,d.isRecurring?1:0,d.recurringPeriod||null)
  db.prepare(`INSERT INTO Transaction (id,type,referenceId,description,amount,date,category,createdAt) VALUES (?,?,?,?,?,?,?,datetime('now'))`).run(generateId(),'expense',id,d.description,Number(d.amount),d.date,d.category)
  logAudit('CREATE','Expense',id,d)
  return { success: true, id }
})

ipcMain.handle('update-expense', (_, { id, data: d }) => {
  db.prepare(`UPDATE Expense SET category=?,description=?,amount=?,date=?,notes=?,isRecurring=?,recurringPeriod=?,updatedAt=datetime('now') WHERE id=?`).run(d.category,d.description,Number(d.amount),d.date,d.notes||null,d.isRecurring?1:0,d.recurringPeriod||null,id)
  logAudit('UPDATE','Expense',id,d)
  return { success: true }
})

ipcMain.handle('delete-expense', (_, id) => {
  db.prepare(`DELETE FROM Expense WHERE id=?`).run(id)
  db.prepare(`DELETE FROM Transaction WHERE referenceId=? AND type='expense'`).run(id)
  logAudit('DELETE','Expense',id,null)
  return { success: true }
})

// ─── REPORTS ─────────────────────────────────────────────────
ipcMain.handle('get-report', (_, { type, dateFrom, dateTo, customerId }) => {
  const from = dateFrom || '2000-01-01', to = dateTo || '2099-12-31'
  if (type === 'pl') {
    const revenue = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM Payment WHERE date BETWEEN ? AND ?`).get(from,to).v
    const expenses = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM Expense WHERE date BETWEEN ? AND ?`).get(from,to).v
    const expBreakdown = db.prepare(`SELECT category, SUM(amount) as total FROM Expense WHERE date BETWEEN ? AND ? GROUP BY category ORDER BY total DESC`).all(from,to)
    const invoicesSummary = db.prepare(`SELECT status, COUNT(*) as count, SUM(amount) as total FROM Invoice WHERE date BETWEEN ? AND ? GROUP BY status`).all(from,to)
    const paymentsList = db.prepare(`SELECT p.*,c.name as customerName,i.invoiceNumber FROM Payment p JOIN Customer c ON p.customerId=c.id JOIN Invoice i ON p.invoiceId=i.id WHERE p.date BETWEEN ? AND ? ORDER BY p.date DESC`).all(from,to)
    return { revenue, expenses, netProfit: revenue-expenses, expBreakdown, invoicesSummary, paymentsList }
  }
  if (type === 'receivable_aging') {
    const invs = db.prepare(`SELECT i.*,c.name as customerName FROM Invoice i JOIN Customer c ON i.customerId=c.id WHERE i.paidAmount < i.amount AND i.status NOT IN ('paid','draft','cancelled')`).all()
    const now = new Date()
    const buckets = [{label:'Not Due',invoices:[]},{label:'1–30 Days',invoices:[]},{label:'31–60 Days',invoices:[]},{label:'61–90 Days',invoices:[]},{label:'90+ Days',invoices:[]}]
    invs.forEach(inv => {
      const days = Math.floor((now-new Date(inv.dueDate))/86400000)
      inv.balance = inv.amount-inv.paidAmount
      inv.daysOverdue = days
      if(days<=0)buckets[0].invoices.push(inv)
      else if(days<=30)buckets[1].invoices.push(inv)
      else if(days<=60)buckets[2].invoices.push(inv)
      else if(days<=90)buckets[3].invoices.push(inv)
      else buckets[4].invoices.push(inv)
    })
    return buckets.map(b=>({...b,total:b.invoices.reduce((s,i)=>s+i.balance,0),count:b.invoices.length}))
  }
  if (type === 'customer_statement' && customerId) {
    const customer = db.prepare(`SELECT * FROM Customer WHERE id=?`).get(customerId)
    const invoices = db.prepare(`SELECT * FROM Invoice WHERE customerId=? ORDER BY date`).all(customerId)
    const payments = db.prepare(`SELECT * FROM Payment WHERE customerId=? ORDER BY date`).all(customerId)
    return { customer, invoices, payments }
  }
  if (type === 'expense_report') {
    const expenses = db.prepare(`SELECT * FROM Expense WHERE date BETWEEN ? AND ? ORDER BY date DESC`).all(from,to)
    const byCategory = db.prepare(`SELECT category, SUM(amount) as total, COUNT(*) as count FROM Expense WHERE date BETWEEN ? AND ? GROUP BY category ORDER BY total DESC`).all(from,to)
    return { expenses, byCategory, total: expenses.reduce((s,e)=>s+e.amount,0) }
  }
  return {}
})

// ─── NOTIFICATIONS ───────────────────────────────────────────
ipcMain.handle('get-notifications', () => {
  updateOverdue()
  const overdues = db.prepare(`SELECT i.invoiceNumber,c.name as customerName,i.amount-i.paidAmount as balance FROM Invoice i JOIN Customer c ON i.customerId=c.id WHERE i.status='overdue' LIMIT 5`).all()
  const stored = db.prepare(`SELECT * FROM Notification ORDER BY createdAt DESC LIMIT 30`).all()
  const dynamic = overdues.map(inv=>({ id:`od_${inv.invoiceNumber}`,type:'warning',title:'Overdue Invoice',message:`${inv.invoiceNumber} — ${inv.customerName}: Rs. ${Math.round(inv.balance).toLocaleString()} overdue`,read:false,createdAt:new Date().toISOString() }))
  return [...dynamic,...stored]
})

ipcMain.handle('mark-notification-read', (_, id) => { try { db.prepare(`UPDATE Notification SET read=1 WHERE id=?`).run(id) } catch {} return { success: true } })

// ─── BACKUP ──────────────────────────────────────────────────
ipcMain.handle('backup-database', async () => {
  try {
    const { filePath } = await dialog.showSaveDialog({ defaultPath:`acos-backup-${Date.now()}.db`, filters:[{name:'SQLite DB',extensions:['db']}] })
    if (!filePath) return { success: false }
    fs.copyFileSync(getDbPath(), filePath)
    return { success: true, path: filePath }
  } catch(e) { return { success: false, error: e.message } }
})

ipcMain.handle('open-file-dialog', async (_, options) => {
  const { filePaths } = await dialog.showOpenDialog(options||{})
  return filePaths||[]
})

ipcMain.handle('show-notification', (_, { title, body }) => {
  try { const { Notification } = require('electron'); new Notification({ title, body }).show() } catch {}
})

// ─── GOOGLE DRIVE ────────────────────────────────────────────
function getTokensPath() { return path.join(app.getPath('userData'), 'gdrive-tokens.json') }
function loadTokens() { try { const p=getTokensPath(); if(fs.existsSync(p)) return JSON.parse(fs.readFileSync(p,'utf8')) } catch {} return null }
function saveTokens(t) { fs.writeFileSync(getTokensPath(), JSON.stringify(t)) }

ipcMain.handle('gdrive-get-status', () => { const t=loadTokens(); return { connected: !!(t&&t.access_token) } })

ipcMain.handle('gdrive-connect', async (_, credentials) => {
  try {
    const { google } = require('googleapis')
    const oauth2Client = new google.auth.OAuth2(credentials.client_id, credentials.client_secret, 'urn:ietf:wg:oauth:2.0:oob')
    const authUrl = oauth2Client.generateAuthUrl({ access_type:'offline', scope:['https://www.googleapis.com/auth/drive.file'] })
    shell.openExternal(authUrl)
    return { success: true, authUrl }
  } catch(e) { return { success: false, error: e.message } }
})

ipcMain.handle('gdrive-set-code', async (_, { code, credentials }) => {
  try {
    const { google } = require('googleapis')
    const oauth2Client = new google.auth.OAuth2(credentials.client_id, credentials.client_secret, 'urn:ietf:wg:oauth:2.0:oob')
    const { tokens } = await oauth2Client.getToken(code)
    saveTokens({ ...tokens, credentials })
    return { success: true }
  } catch(e) { return { success: false, error: e.message } }
})

ipcMain.handle('gdrive-backup', async () => {
  try {
    const stored = loadTokens()
    if (!stored) return { success: false, error: 'Not connected to Google Drive' }
    const { google } = require('googleapis')
    const oauth2Client = new google.auth.OAuth2(stored.credentials.client_id, stored.credentials.client_secret, 'urn:ietf:wg:oauth:2.0:oob')
    oauth2Client.setCredentials(stored)
    const drive = google.drive({ version:'v3', auth: oauth2Client })
    const dbPath = getDbPath()
    const fileName = `acos-backup-${new Date().toISOString().split('T')[0]}.db`
    const folderSearch = await drive.files.list({ q:"name='ACOS Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false", fields:'files(id)' })
    let folderId
    if (folderSearch.data.files.length > 0) folderId = folderSearch.data.files[0].id
    else { const f=await drive.files.create({requestBody:{name:'ACOS Backups',mimeType:'application/vnd.google-apps.folder'},fields:'id'}); folderId=f.data.id }
    const res = await drive.files.create({ requestBody:{name:fileName,parents:[folderId]}, media:{mimeType:'application/octet-stream',body:fs.createReadStream(dbPath)}, fields:'id,name,webViewLink' })
    return { success: true, fileName: res.data.name, link: res.data.webViewLink }
  } catch(e) { return { success: false, error: e.message } }
})

ipcMain.handle('gdrive-disconnect', () => { try { fs.unlinkSync(getTokensPath()) } catch {} return { success: true } })

// ─── WINDOW ──────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 700,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#F8F9FB',
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') },
    show: false,
  })
  if (isDev) win.loadURL('http://localhost:5173')
  else win.loadFile(path.join(__dirname, '../dist/index.html'))
  win.once('ready-to-show', () => win.show())
}

app.whenReady().then(() => { initDatabase(); createWindow() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
