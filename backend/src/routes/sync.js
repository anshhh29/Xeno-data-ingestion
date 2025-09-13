const router = require('express').Router();
const auth = require('../middleware/auth');
const { pullTenantById } = require('../services/shopify');
const { Tenant } = require('../models');

router.post('/sync/me', auth, async (req,res) => {
  await pullTenantById(req.user.tenantId);
  res.json({ status: 'ok' });
});

router.post('/sync/all', async (req,res) => {
  const tenants = await Tenant.findAll();
  for (const t of tenants) await pullTenantById(t.id);
  res.json({ status: 'ok', tenants: tenants.length });
});

module.exports = router;
