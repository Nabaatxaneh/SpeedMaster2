'use strict';

const express           = require('express');
const { requireLogin }  = require('../auth');
const { getDb }         = require('../db');
const { formatGBP }     = require('../util/money');
const router            = express.Router();

router.get('/dashboard', requireLogin, (req, res) => {
  const db = getDb();

  const unfulfilledCount    = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE fulfillment_status = 'Unfulfilled'").get().n;
  const pendingSettlements  = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE supplier_payment_status = 'Pending' AND fulfillment_status = 'Shipped'").get().n;
  const totalRevenuePence   = db.prepare("SELECT COALESCE(SUM(retail_price_paid_pence),0) AS t FROM orders").get().t;
  const recentOrders        = db.prepare(`
    SELECT o.*, s.name AS supplier_name
    FROM orders o LEFT JOIN suppliers s ON s.id = o.supplier_id
    ORDER BY o.created_at DESC LIMIT 10
  `).all();

  res.render('admin/dashboard', {
    title: 'Dashboard',
    user: req.session.user,
    unfulfilledCount,
    pendingSettlements,
    totalRevenue: formatGBP(totalRevenuePence),
    recentOrders,
    formatGBP,
  });
});

module.exports = router;
