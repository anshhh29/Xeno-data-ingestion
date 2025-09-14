require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');

process.env.PORT = process.env.PORT || '4000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
process.env.DEFAULT_TENANT_NAME = process.env.DEFAULT_TENANT_NAME || 'Demo Tenant';
process.env.DEFAULT_SHOP_DOMAIN = process.env.DEFAULT_SHOP_DOMAIN || 'trenddzyy.myshopify.com';
process.env.DEFAULT_SHOP_TOKEN = process.env.DEFAULT_SHOP_TOKEN;
process.env.SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-04';
process.env.SHOPIFY_APP_SECRET = process.env.SHOPIFY_APP_SECRET || 'dev_webhook_hmac_secret';
process.env.DB_NAME = process.env.DB_NAME || 'trendzy_db';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'anshhh29';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';

const { sequelize, Tenant } = require('./models');
const { pullTenantById } = require('./services/shopify');

const app = express();

function normalizeDomain(domain) {
  if (!domain) return '';
  return String(domain).replace(/^https?:\/\//, '').replace(/\/$/, '');
}

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());


app.use('/webhooks', bodyParser.raw({ type: 'application/json' }));

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.get('/api/db-check', async (req, res) => {
  try {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'anshhh29',
      database: process.env.DB_NAME || 'trendzy_db'
    });

    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(table => Object.values(table)[0]);

    let data = { tables: tableNames };

    if (tableNames.includes('customers')) {
      const [customers] = await connection.execute('SELECT COUNT(*) as count FROM customers');
      data.customers = customers[0].count;
    }

    if (tableNames.includes('orders')) {
      const [orders] = await connection.execute('SELECT COUNT(*) as count, SUM(totalPrice) as revenue FROM orders');
      data.orders = orders[0].count;
      data.revenue = orders[0].revenue || 0;
    }

    await connection.end();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/auth', require('./routes/auth'));        
app.use('/api/sync', require('./routes/sync'));       
app.use('/api/metrics', require('./routes/metrics-real'));  
app.use('/webhooks', require('./routes/webhooks'));   
async function ensureSchema() {
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'anshhh29',
    database: process.env.DB_NAME || 'trendzy_db'
  });

  async function columnExists(tableName, columnName) {
    const [rows] = await connection.execute(
      'SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [process.env.DB_NAME || 'trendzy_db', tableName, columnName]
    );
    return rows[0].cnt > 0;
  }

  async function indexExists(indexName, tableName) {
    const [rows] = await connection.execute(
      'SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?',
      [process.env.DB_NAME || 'trendzy_db', tableName, indexName]
    );
    return rows[0].cnt > 0;
  }

  // 1) Drop existing FK(s) before altering column types
  try {
    const [fkRows] = await connection.execute(
      "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'customerId' AND REFERENCED_TABLE_NAME = 'customers'",
      [process.env.DB_NAME || 'trendzy_db']
    );
    for (const row of fkRows) {
      await connection.execute(`ALTER TABLE orders DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``);
    }
  } catch (e) {
  }

  await connection.execute('DELETE FROM orders WHERE id > 4294967295');
  await connection.execute('DELETE FROM customers WHERE id > 4294967295');
  await connection.execute('DELETE FROM products WHERE id > 4294967295');

  await connection.execute('ALTER TABLE customers MODIFY id INT UNSIGNED NOT NULL AUTO_INCREMENT');
  await connection.execute('ALTER TABLE products MODIFY id INT UNSIGNED NOT NULL AUTO_INCREMENT');
  await connection.execute('ALTER TABLE orders MODIFY id INT UNSIGNED NOT NULL AUTO_INCREMENT');
  await connection.execute('ALTER TABLE orders MODIFY customerId INT UNSIGNED NULL');

  if (!(await columnExists('customers', 'shopifyId'))) {
    await connection.execute('ALTER TABLE customers ADD COLUMN shopifyId BIGINT NULL');
  }
  if (!(await columnExists('customers', 'phone'))) {
    await connection.execute('ALTER TABLE customers ADD COLUMN phone VARCHAR(50) NULL');
  }
  if (!(await indexExists('unique_customer_per_tenant', 'customers'))) {
    await connection.execute('CREATE UNIQUE INDEX unique_customer_per_tenant ON customers (shopifyId, tenantId)');
  }
  if (!(await columnExists('products', 'shopifyId'))) {
    await connection.execute('ALTER TABLE products ADD COLUMN shopifyId BIGINT NULL');
  }
  if (!(await columnExists('products', 'handle'))) {
    await connection.execute('ALTER TABLE products ADD COLUMN handle VARCHAR(255) NULL');
  }
  if (!(await indexExists('unique_product_per_tenant', 'products'))) {
    await connection.execute('CREATE UNIQUE INDEX unique_product_per_tenant ON products (shopifyId, tenantId)');
  }
  if (!(await columnExists('orders', 'shopifyId'))) {
    await connection.execute('ALTER TABLE orders ADD COLUMN shopifyId BIGINT NULL');
  }
  if (!(await columnExists('orders', 'orderNumber'))) {
    await connection.execute('ALTER TABLE orders ADD COLUMN orderNumber VARCHAR(100) NULL');
  }
  if (!(await columnExists('orders', 'status'))) {
    await connection.execute('ALTER TABLE orders ADD COLUMN status VARCHAR(50) NULL');
  }
  if (!(await columnExists('orders', 'createdAt'))) {
    await connection.execute('ALTER TABLE orders ADD COLUMN createdAt DATETIME NULL');
  }
  if (!(await indexExists('unique_order_per_tenant', 'orders'))) {
    await connection.execute('CREATE UNIQUE INDEX unique_order_per_tenant ON orders (shopifyId, tenantId)');
  }

  await connection.execute('ALTER TABLE orders ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL');

  await connection.end();
  console.log('🧱 Schema verified/updated for Shopify ID columns');
}

async function runAutoSyncWithRetries() {
  const { pullAll } = require('./services/shopify');
  const maxAttempts = 3;
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      let tenants = await Tenant.findAll();
      const temp = new Map();
      for (const t of tenants) {
        const d = normalizeDomain(t.shopDomain);
        if (!temp.has(d)) temp.set(d, t);
        else {
          await t.destroy();
        }
      }
      tenants = Array.from(temp.values());
      const targetDomain = normalizeDomain(process.env.DEFAULT_SHOP_DOMAIN || '');
      if (targetDomain) {
        tenants = tenants.filter(t => (t.shopDomain || '').replace(/^https?:\/\//, '').replace(/\/$/, '') === targetDomain);
      }
      console.log(`🔄 Auto-sync attempt ${attempt}: syncing ${tenants.length} tenants`);
      for (const tenant of tenants) {
        console.log(`   ↪︎ Syncing tenant: ${tenant.name} (${tenant.shopDomain})`);
        await pullAll(tenant);
      }
      console.log('✅ Auto-sync completed');
      return;
    } catch (err) {
      console.warn(`⚠️ Auto-sync attempt ${attempt} failed: ${err.message}`);
      const backoffMs = Math.min(30000, 2000 * Math.pow(2, attempt - 1));
      console.log(`⏳ Retrying auto-sync in ${Math.round(backoffMs / 1000)}s...`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
  console.error('❌ Auto-sync failed after maximum retry attempts');
}

app.post('/api/sync-shopify', async (req, res) => {
  try {
    console.log('🔄 Starting immediate Shopify sync...');
    const { pullAll } = require('./services/shopify');
    const { Tenant } = require('./models');
    
    let tenants = await Tenant.findAll();
    const map = new Map();
    for (const t of tenants) {
      const d = normalizeDomain(t.shopDomain);
      if (!map.has(d)) map.set(d, t);
      else {
        await t.destroy();
      }
    }
    tenants = Array.from(map.values());
    console.log(`📋 Found ${tenants.length} tenants to sync`);
    
    for (const tenant of tenants) {
      console.log(`🔄 Syncing tenant: ${tenant.name} (${tenant.shopDomain})`);
      await pullAll(tenant);
      console.log(`✅ Completed sync for: ${tenant.name}`);
    }
    
    res.json({ 
      message: 'Shopify data synced successfully', 
      tenantsSynced: tenants.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fetch-shopify-orders', async (req, res) => {
  try {
    console.log('🔄 Fetching orders from Shopify store...');
    
    const axios = require('axios');
    const mysql = require('mysql2/promise');
    
    const shopDomain = 'trenddzyy.myshopify.com';
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'anshhh29',
      database: process.env.DB_NAME || 'trendzy_db'
    });
    
    // Clear existing data
    await connection.execute('DELETE FROM orders');
    await connection.execute('DELETE FROM customers');
    
    // Fetch orders from Shopify
    const ordersResponse = await axios.get(
      `https://${shopDomain}/admin/api/2024-04/orders.json?limit=250&status=any`,
      { 
        headers: { 'X-Shopify-Access-Token': accessToken },
        timeout: 30000
      }
    );
    
    const orders = ordersResponse.data.orders;
    console.log(`📦 Found ${orders.length} orders in Shopify`);
    
    let customersInserted = 0;
    let ordersInserted = 0;
    
    for (const order of orders) {
      let customerId = null;
      if (order.customer) {
        await connection.execute(
          'INSERT INTO customers (shopifyId, tenantId, firstName, lastName, email, totalSpent) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE totalSpent = VALUES(totalSpent)',
          [
            order.customer.id, 1, order.customer.first_name || '', order.customer.last_name || '',
            order.customer.email || '', parseFloat(order.customer.total_spent || 0)
          ]
        );
        
        const [customer] = await connection.execute(
          'SELECT id FROM customers WHERE shopifyId = ? AND tenantId = ?',
          [order.customer.id, 1]
        );
        customerId = customer[0]?.id;
        customersInserted++;
      }
      
      await connection.execute(
        'INSERT INTO orders (shopifyId, tenantId, customerId, orderNumber, totalPrice, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE totalPrice = VALUES(totalPrice), status = VALUES(status)',
        [
          order.id, 1, customerId, order.order_number || order.name || `#${order.id}`,
          parseFloat(order.total_price || 0), order.financial_status || 'pending',
          new Date(order.created_at || new Date())
        ]
      );
      ordersInserted++;
    }
    
    const [totalRevenue] = await connection.execute('SELECT SUM(totalPrice) as total FROM orders');
    
    await connection.end();
    
    res.json({ 
      message: 'Shopify orders successfully fetched and uploaded to database',
      ordersFound: orders.length,
      ordersInserted: ordersInserted,
      customersInserted: customersInserted,
      totalRevenue: totalRevenue[0].total || 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('Fetch Shopify orders error:', err);
    res.status(500).json({ 
      error: err.message,
      suggestion: 'Check your internet connection and Shopify store access'
    });
  }
});

app.post('/api/ensure-schema', async (req, res) => {
  try {
    await ensureSchema();
    res.json({ ok: true, message: 'Schema ensured' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/force-sync', async (req, res) => {
  try {
    console.log('🚀 Force syncing Shopify data...');
    
    const axios = require('axios');
    const mysql = require('mysql2/promise');
    
    const tenants = await Tenant.findAll();
    if (!tenants.length) return res.status(400).json({ error: 'No tenants configured' });
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'anshhh29',
      database: process.env.DB_NAME || 'trendzy_db'
    });
    
    let ordersTotal = 0;
    let customersTotal = 0;
    
    for (const tenant of tenants) {
      const shopDomain = (tenant.shopDomain || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
      const accessToken = tenant.shopAccessToken;

      const ordersResponse = await axios.get(
        `https://${shopDomain}/admin/api/${process.env.SHOPIFY_API_VERSION || '2024-04'}/orders.json?status=any&limit=250`,
        { headers: { 'X-Shopify-Access-Token': accessToken }, timeout: 30000 }
      );
      const customersResponse = await axios.get(
        `https://${shopDomain}/admin/api/${process.env.SHOPIFY_API_VERSION || '2024-04'}/customers.json?limit=250`,
        { headers: { 'X-Shopify-Access-Token': accessToken }, timeout: 30000 }
      );

      const customers = customersResponse.data.customers || [];
      const orders = ordersResponse.data.orders || [];
      console.log(`📦 [${tenant.name}] orders=${orders.length} customers=${customers.length}`);
      customersTotal += customers.length;
      ordersTotal += orders.length;

      for (const customer of customers) {
        await connection.execute(
          'INSERT INTO customers (shopifyId, tenantId, firstName, lastName, email, totalSpent) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE totalSpent = VALUES(totalSpent)',
          [customer.id, tenant.id, customer.first_name || '', customer.last_name || '', customer.email || '', parseFloat(customer.total_spent || 0)]
        );
      }

      for (const order of orders) {
        let customerId = null;
        if (order.customer?.id) {
          const [rows] = await connection.execute(
            'SELECT id FROM customers WHERE shopifyId = ? AND tenantId = ?',
            [order.customer.id, tenant.id]
          );
          customerId = rows[0]?.id || null;
        }
        await connection.execute(
          'INSERT INTO orders (shopifyId, tenantId, customerId, orderNumber, totalPrice, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE totalPrice = VALUES(totalPrice), status = VALUES(status)',
          [order.id, tenant.id, customerId, order.order_number || order.name || `#${order.id}`, parseFloat(order.total_price || 0), order.financial_status || 'pending', new Date(order.created_at || new Date())]
        );
      }
    }

    await connection.end();

    res.json({ message: 'Force sync completed', orders: ordersTotal, customers: customersTotal, timestamp: new Date().toISOString() });
    
  } catch (err) {
    console.error('Force sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/insert-sample-data', async (req, res) => {
  try {
    console.log('📊 Inserting sample data...');
    
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'anshhh29',
      database: process.env.DB_NAME || 'trendzy_db'
    });

    await connection.execute('DELETE FROM orders');
    await connection.execute('DELETE FROM customers');
    await connection.execute('DELETE FROM products');

    const customers = [
      { id: 1001, firstName: 'John', lastName: 'Doe', email: 'john@example.com', totalSpent: 150.00 },
      { id: 1002, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', totalSpent: 275.50 },
      { id: 1003, firstName: 'Mike', lastName: 'Johnson', email: 'mike@example.com', totalSpent: 89.99 },
      { id: 1004, firstName: 'Sarah', lastName: 'Wilson', email: 'sarah@example.com', totalSpent: 320.75 }
    ];

    for (const customer of customers) {
      await connection.execute(
        'INSERT INTO customers (id, tenantId, firstName, lastName, email, totalSpent) VALUES (?, ?, ?, ?, ?, ?)',
        [customer.id, 1, customer.firstName, customer.lastName, customer.email, customer.totalSpent]
      );
    }

    const orders = [
      { id: 3001, customerId: 1001, orderNumber: 'ORD-001', totalPrice: 150.00, status: 'paid', createdAt: '2024-01-15' },
      { id: 3002, customerId: 1002, orderNumber: 'ORD-002', totalPrice: 275.50, status: 'paid', createdAt: '2024-01-16' },
      { id: 3003, customerId: 1003, orderNumber: 'ORD-003', totalPrice: 89.99, status: 'pending', createdAt: '2024-01-17' },
      { id: 3004, customerId: 1004, orderNumber: 'ORD-004', totalPrice: 320.75, status: 'paid', createdAt: '2024-01-18' }
    ];

    for (const order of orders) {
      await connection.execute(
        'INSERT INTO orders (id, tenantId, customerId, orderNumber, totalPrice, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [order.id, 1, order.customerId, order.orderNumber, order.totalPrice, order.status, order.createdAt]
      );
    }

    await connection.end();
    
    res.json({ 
      message: 'Sample data inserted successfully',
      customers: customers.length,
      orders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalPrice, 0)
    });
    
  } catch (err) {
    console.error('Sample data error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/test-webhook', async (req, res) => {
  try {
    console.log('🧪 Testing webhook with sample order data...');
    
    const sampleOrder = {
      id: Date.now(), 
      order_number: `TEST-${Date.now()}`,
      name: `#TEST-${Date.now()}`,
      total_price: '99.99',
      financial_status: 'paid',
      created_at: new Date().toISOString(),
      customer: {
        id: Date.now() + 1000,
        first_name: 'Test',
        last_name: 'Customer',
        email: 'test@example.com',
        total_spent: '199.98'
      }
    };
    
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'anshhh29',
      database: process.env.DB_NAME || 'trendzy_db'
    });
    
    await connection.execute(
      'INSERT INTO customers (shopifyId, tenantId, firstName, lastName, email, totalSpent) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE totalSpent = VALUES(totalSpent)',
      [
        sampleOrder.customer.id,
        1, 
        sampleOrder.customer.first_name,
        sampleOrder.customer.last_name,
        sampleOrder.customer.email,
        parseFloat(sampleOrder.customer.total_spent)
      ]
    );
    
    const [customer] = await connection.execute(
      'SELECT id FROM customers WHERE shopifyId = ? AND tenantId = ?',
      [sampleOrder.customer.id, 1]
    );
    const customerId = customer[0]?.id;
    
    await connection.execute(
      'INSERT INTO orders (shopifyId, tenantId, customerId, orderNumber, totalPrice, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        sampleOrder.id,
        1, 
        customerId,
        sampleOrder.order_number,
        parseFloat(sampleOrder.total_price),
        sampleOrder.financial_status,
        new Date(sampleOrder.created_at)
      ]
    );
    
    await connection.end();
    
    console.log(`✅ Test order ${sampleOrder.order_number} created successfully!`);
    res.json({ 
      message: 'Test order created successfully', 
      order: sampleOrder,
      customerId: customerId
    });
    
  } catch (err) {
    console.error('Test webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});
app.get('/sync-shopify/:tenantId', async (req, res) => {
  try {
    const tenantId = req.params.tenantId;
    await pullTenantById(tenantId);      
    res.json({ message: 'Shopify data synced' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

(async () => {
  try {
    await sequelize.sync();

    const [t] = await Tenant.findOrCreate({
      where: { shopDomain: process.env.DEFAULT_SHOP_DOMAIN },
      defaults: {
        name: process.env.DEFAULT_TENANT_NAME,
        shopDomain: process.env.DEFAULT_SHOP_DOMAIN,
        shopAccessToken: process.env.DEFAULT_SHOP_TOKEN,
      },
    });
    console.log(`✅ Default tenant ready: ${t.name}`);

    await ensureSchema();

    runAutoSyncWithRetries();
  } catch (err) {
    console.error("❌ DB bootstrap failed:", err.message);
  }
})();


cron.schedule('* * * * *', async () => {
  console.log('⏰ Running scheduled auto-sync (every 1 minute)...');
  await runAutoSyncWithRetries();
});

console.log("ℹ️ Automatic sync enabled (background with retries). Use /api/sync-shopify to trigger manually.");



const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`🚀 API running on http://localhost:${port}`));

