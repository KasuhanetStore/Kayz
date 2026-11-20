export async function ensureSalesInvoiceTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS sales_invoice_sequences (
    period TEXT PRIMARY KEY, last_number INTEGER NOT NULL DEFAULT 0
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS sales_invoices (
    id TEXT PRIMARY KEY, invoice_no TEXT NOT NULL UNIQUE,
    gateway TEXT NOT NULL, order_id TEXT NOT NULL,
    customer_name TEXT NOT NULL, customer_email TEXT NOT NULL,
    customer_phone TEXT, description TEXT NOT NULL,
    amount INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'myr',
    payment_status TEXT NOT NULL DEFAULT 'paid',
    paid_at TEXT, issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(gateway,order_id)
  )`).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_sales_invoices_issued ON sales_invoices(issued_at DESC)").run();
}

export async function createPaidInvoiceRecord(db, gateway, orderId) {
  await ensureSalesInvoiceTables(db);
  const safeGateway=String(gateway||'').toLowerCase();
  const table=safeGateway==='stripe'?'stripe_orders':safeGateway==='toyyibpay'?'toyyibpay_orders':null;
  if(!table) throw new Error('Unsupported payment gateway');
  const existing=await db.prepare("SELECT invoice_no FROM sales_invoices WHERE gateway=? AND order_id=?").bind(safeGateway,String(orderId)).first();
  if(existing) return existing.invoice_no;
  const order=await db.prepare(`SELECT id,package_name,amount,currency,customer_name,customer_email,customer_phone,status,paid_at FROM ${table} WHERE id=?`).bind(String(orderId)).first();
  if(!order || order.status!=='paid') throw new Error('Only a verified paid order can receive an invoice record');
  const period=new Date().toISOString().slice(0,7).replace('-','');
  const sequence=await db.prepare(`INSERT INTO sales_invoice_sequences(period,last_number) VALUES(?,1)
    ON CONFLICT(period) DO UPDATE SET last_number=last_number+1
    RETURNING last_number`).bind(period).first();
  const invoiceNo='KN-INV-'+period+'-'+String(sequence?.last_number||1).padStart(5,'0');
  const id=crypto.randomUUID();
  await db.prepare(`INSERT OR IGNORE INTO sales_invoices
    (id,invoice_no,gateway,order_id,customer_name,customer_email,customer_phone,description,amount,currency,payment_status,paid_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,'paid',?)`)
    .bind(id,invoiceNo,safeGateway,String(orderId),order.customer_name,order.customer_email,order.customer_phone||null,order.package_name,Number(order.amount),order.currency||'myr',order.paid_at||null).run();
  const saved=await db.prepare("SELECT invoice_no FROM sales_invoices WHERE gateway=? AND order_id=?").bind(safeGateway,String(orderId)).first();
  if(!saved) throw new Error('Invoice record could not be saved');
  return saved.invoice_no;
}
