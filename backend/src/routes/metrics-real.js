const router = require("express").Router();
const mysql = require("mysql2/promise");

function getDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "anshhh29",
    database: process.env.DB_NAME || "trendzy_db",
  });
}

router.get("/customers-debug", async (req, res) => {
  try {
    const connection = await getDbConnection();
    const [rows] = await connection.execute(
      "SELECT id, firstName, lastName, email, totalSpent, ordersCount FROM customers LIMIT 20"
    );
    await connection.end();
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching customers:", err.message);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const connection = await getDbConnection();

    let totalCustomers = 0;
    let totalOrders = 0;
    let totalRevenue = 0;

    try {
      const [customers] = await connection.execute(
        "SELECT COUNT(*) as count FROM customers"
      );
      totalCustomers = customers[0]?.count || 0;
    } catch {}

    try {
      const [orders] = await connection.execute(
        "SELECT COUNT(*) as count, SUM(totalPrice) as revenue FROM orders WHERE status = 'paid'"
      );
      totalOrders = orders[0]?.count || 0;
      totalRevenue = orders[0]?.revenue ? Number(orders[0].revenue) : 0;
    } catch {}

    await connection.end();
    res.json({
      totalCustomers,
      totalOrders,
      totalRevenue: totalRevenue ? Number(totalRevenue.toFixed(2)) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch summary metrics" });
  }
});


router.get("/orders-by-date", async (req, res) => {
  try {
    const connection = await getDbConnection();
    const { start, end } = req.query;

    const query = `
      SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') as order_date,
             COUNT(*) as orders_count,
             SUM(totalPrice) as daily_revenue
      FROM orders
      WHERE createdAt IS NOT NULL
        AND status = 'paid'
        ${start ? "AND DATE(createdAt) >= ?" : ""}
        ${end ? "AND DATE(createdAt) <= ?" : ""}
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d')
      ORDER BY order_date ASC
    `;

    const params = [];
    if (start) params.push(start);
    if (end) params.push(end);

    const [rows] = await connection.execute(query, params);

    const today = new Date();
    const startDate = start
      ? new Date(start)
      : new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : today;

    const dataMap = {};
    rows.forEach((row) => {
      const key = row.order_date;
      dataMap[key] = {
        orders: Number(row.orders_count || 0),
        revenue: row.daily_revenue ? Number(row.daily_revenue) : 0,
      };
    });

    const series = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      series.push({
        date: key,
        orders: dataMap[key]?.orders || 0,
        revenue: dataMap[key]?.revenue || 0,
      });
    }

    await connection.end();
    res.json({ series });
  } catch (err) {
    console.error("Error fetching orders by date", err);
    res.status(500).json({ error: "Failed to fetch orders by date" });
  }
});

/**
 * TOP CUSTOMERS
 */
router.get("/top-customers", async (req, res) => {
  try {
    const connection = await getDbConnection();

    const possibleNameSets = [
      ["firstName", "lastName"],
      ["first_name", "last_name"],
      ["name"],
      ["customer_name"],
      ["full_name"],
    ];

    let nameSet = null;
    for (const cols of possibleNameSets) {
      try {
        await connection.execute(
          `SELECT ${cols.join(", ")} FROM customers LIMIT 1`
        );
        nameSet = cols;
        break;
      } catch {}
    }

    const [rows] = await connection.execute(
      `
      SELECT c.id as customerId,
             ${nameSet ? nameSet.map((col) => "c." + col).join(", ") : "'' as name"},
             c.email,
             SUM(o.totalPrice) as totalSpent
      FROM customers c
      JOIN orders o ON o.customerId = c.id
      WHERE o.status = 'paid'
      GROUP BY c.id
      ORDER BY totalSpent DESC
      LIMIT 5
      `
    );

    const topCustomers = rows.map((row) => {
      let displayName = "";

      if (nameSet) {
        if (nameSet.length === 2) {
          displayName = `${row[nameSet[0]] || ""} ${row[nameSet[1]] || ""}`.trim();
        } else {
          displayName = row[nameSet[0]] || "";
        }
      }

      if (!displayName || displayName.trim() === "") {
        displayName = row.email || "Customer " + row.customerId;
      }

      return {
        name: displayName,
        email: row.email || "",
        totalSpent: row.totalSpent ? Number(row.totalSpent) : 0,
      };
    });

    await connection.end();
    res.json({ topCustomers });
  } catch (err) {
    console.error("❌ Error fetching top customers:", err.message);
    res.status(500).json({ error: "Failed to fetch top customers" });
  }
});

module.exports = router;
