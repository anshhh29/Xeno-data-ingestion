const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { Tenant, Customer, Product, Order } = require('../models');

function getDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'anshhh29',
    database: process.env.DB_NAME || 'trendzy_db'
  });
}

function verifyHmac(req, res, next) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  const digest = crypto
    .createHmac('sha256', process.env.SHOPIFY_APP_SECRET)
    .update(req.body, 'utf8')
    .digest('base64');

  if (digest === hmacHeader) return next();
  console.warn('⚠️ Invalid HMAC detected');
  return res.status(401).send('Invalid HMAC');
}

router.post('/shopify', verifyHmac, async (req, res) => {
  const topic = req.get('X-Shopify-Topic');
  const shop = req.get('X-Shopify-Shop-Domain');

  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    console.error('❌ Failed to parse webhook payload:', err.message);
    return res.status(400).send('Invalid JSON payload');
  }

  const tenant = await Tenant.findOne({ where: { shopDomain: shop } });
  if (!tenant) {
    console.warn(`⚠️ Tenant not found for shop: ${shop}`);
    return res.status(404).send('Tenant not found');
  }

  try {
    if (topic.startsWith('customers/')) {
      const defaultAddress = (payload.addresses || []).find(a => a.default) || {};

await Customer.upsert({
  shopifyId: payload.id,
  tenantId: tenant.id,
  firstName: payload.first_name || defaultAddress.first_name || null,
  lastName: payload.last_name || defaultAddress.last_name || null,
  email: payload.email || defaultAddress.email || null,
  phone: payload.phone || defaultAddress.phone || null,
  totalSpent: payload.total_spent ? parseFloat(payload.total_spent) : 0,
  ordersCount: payload.orders_count || 0,
  createdAtShopify: payload.created_at ? new Date(payload.created_at) : null,
  updatedAtShopify: payload.updated_at ? new Date(payload.updated_at) : null,
});

      console.log(`✅ Customer synced: ${payload.email}`);
    } else if (topic.startsWith('products/')) {
      const v = payload.variants?.[0];
      await Product.upsert({
        shopifyId: payload.id,
        tenantId: tenant.id,
        title: payload.title,
        price: v ? v.price : null,
        sku: v ? v.sku : null,
        metadata: payload,
        createdAtShopify: payload.created_at,
        updatedAtShopify: payload.updated_at,
      });
      console.log(`✅ Product synced: ${payload.title}`);
    } else if (topic.startsWith('orders/')) {
      console.log(`🔄 Processing order webhook: ${topic} for order ${payload.id}`);
      
      const connection = await getDbConnection();
      
      try {
        let customerId = null;
        if (payload.customer) {
          const [customerResult] = await connection.execute(
            'INSERT INTO customers (shopifyId, tenantId, firstName, lastName, email, totalSpent) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE totalSpent = VALUES(totalSpent)',
            [
              payload.customer.id,
              tenant.id,
              payload.customer.first_name || '',
              payload.customer.last_name || '',
              payload.customer.email || '',
              parseFloat(payload.customer.total_spent || 0)
            ]
          );
          
          const [customer] = await connection.execute(
            'SELECT id FROM customers WHERE shopifyId = ? AND tenantId = ?',
            [payload.customer.id, tenant.id]
          );
          customerId = customer[0]?.id;
          console.log(`👤 Customer processed: ${payload.customer.email} (ID: ${customerId})`);
        }
        
        await connection.execute(
          'INSERT INTO orders (shopifyId, tenantId, customerId, orderNumber, totalPrice, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE totalPrice = VALUES(totalPrice), status = VALUES(status)',
          [
            payload.id,
            tenant.id,
            customerId,
            payload.order_number || payload.name || `#${payload.id}`,
            parseFloat(payload.total_price || 0),
            payload.financial_status || 'pending',
            new Date(payload.created_at || new Date())
          ]
        );
        
        console.log(`✅ Order ${payload.id} synced to MySQL: ${payload.order_number || payload.name} - ₹${payload.total_price}`);
        
        await Order.upsert({
          shopifyId: payload.id,
          tenantId: tenant.id,
          customerId: customerId,
          orderNumber: payload.order_number || payload.name,
          totalPrice: parseFloat(payload.total_price || 0),
          status: payload.financial_status || 'pending',
          createdAt: new Date(payload.created_at || new Date())
        });
        
      } catch (dbError) {
        console.error(`❌ Database error processing order ${payload.id}:`, dbError.message);
        throw dbError;
      } finally {
        await connection.end();
      }
    } else {
      console.log(`ℹ️ Webhook received for unsupported topic: ${topic}`);
    }
  } catch (err) {
    console.error(`❌ Failed to process webhook for topic ${topic}:`, err.message);
    return res.status(500).send('Error processing webhook');
  }

  res.status(200).send('ok');
});

module.exports = router;
