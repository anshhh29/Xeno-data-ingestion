const axios = require('axios');
const { Customer, Product, Order, Tenant } = require('../models');

function normalizeDomain(domain) {
  if (!domain) return '';
  return String(domain).replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function shopifyClient(shopDomain, accessToken) {
  const normalized = normalizeDomain(shopDomain);
  const baseURL = `https://${normalized}/admin/api/${process.env.SHOPIFY_API_VERSION || '2024-04'}`;
  return axios.create({
    baseURL,
    headers: { 'X-Shopify-Access-Token': accessToken }
  });
}

async function pullAll(tenant) {
  console.log(`🔄 Syncing data for tenant: ${tenant.name} (${tenant.shopDomain})`);
  const client = shopifyClient(tenant.shopDomain, tenant.shopAccessToken);

  try {
    console.log('📥 Fetching customers...');
    const custRes = await client.get('/customers.json');
    for (const c of custRes.data.customers) {
      const defaultAddress = c.addresses?.find(addr => addr.default) || {};

      await Customer.upsert({
        tenantId: tenant.id,
        shopifyId: c.id,
        firstName: c.first_name || defaultAddress.first_name || null,
        lastName: c.last_name || defaultAddress.last_name || null,
        email: c.email || defaultAddress.email || null,
        phone: c.phone || defaultAddress.phone || null,
        totalSpent: c.total_spent ? parseFloat(c.total_spent) : 0,
        ordersCount: c.orders_count || 0,
        createdAtShopify: c.created_at ? new Date(c.created_at) : null,
        updatedAtShopify: c.updated_at ? new Date(c.updated_at) : null,
      });
    }
    console.log(`✅ Synced ${custRes.data.customers.length} customers`);

    console.log('📥 Fetching products...');
    const prodRes = await client.get('/products.json');
    for (const p of prodRes.data.products) {
      const variant = p.variants?.[0];
      await Product.upsert({
        tenantId: tenant.id,
        shopifyId: p.id,
        title: p.title,
        handle: p.handle,
        price: variant ? parseFloat(variant.price) : null,
      });
    }
    console.log(`✅ Synced ${prodRes.data.products.length} products`);

    // ---------------- ORDERS ----------------
    console.log('📥 Fetching orders...');
    const ordRes = await client.get('/orders.json?status=any&limit=250');
    for (const o of ordRes.data.orders) {
      let customerId = null;

      if (o.customer?.id) {
        const customer = await Customer.findOne({
          where: { shopifyId: o.customer.id, tenantId: tenant.id }
        });
        if (customer) customerId = customer.id;
      }

      await Order.upsert({
        tenantId: tenant.id,
        shopifyId: o.id,
        customerId,
        orderNumber: o.order_number || null,
        totalPrice: parseFloat(o.total_price || 0),
        currency: o.currency || null,
        status: o.financial_status || o.fulfillment_status || 'unknown',
        createdAtShopify: o.created_at ? new Date(o.created_at) : null,
        updatedAtShopify: o.updated_at ? new Date(o.updated_at) : null,
        createdAt: o.created_at ? new Date(o.created_at) : new Date(), // fallback
      });
    }
    console.log(`✅ Synced ${ordRes.data.orders.length} orders`);

  } catch (error) {
    console.error(`❌ Error syncing tenant ${tenant.name}:`, error.message);
    if (error.response?.data) {
      console.error('👉 Shopify API Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function pullTenantById(tenantId) {
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) throw new Error('Tenant not found');
  await pullAll(tenant);
  return { ok: true };
}

module.exports = { pullTenantById, pullAll };
