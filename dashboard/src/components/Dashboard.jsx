import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const { token, logout } = useAuth();
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [ordersByDate, setOrdersByDate] = useState([]);  
  const [topCustomers, setTopCustomers] = useState([]);

  const inr = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

  function formatDateLabel(dateStr) {
    try {
      const dt = new Date(dateStr + "T00:00:00");
      return dt.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  }

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    axios
      .get("http://localhost:4000/api/metrics/summary", { headers })
      .then((res) => {
        const d = res.data || {};
        setSummary({
          totalCustomers: d.totalCustomers ?? d.total_customers ?? 0,
          totalOrders: d.totalOrders ?? d.total_orders ?? 0,
          totalRevenue: d.totalRevenue ?? d.total_revenue ?? 0,
        });
      })
      .catch((err) => {
        console.error("❌ Failed to fetch summary:", err);
        setSummary({ totalCustomers: 0, totalOrders: 0, totalRevenue: 0 });
      });

    // --- Orders by date ---
axios
.get("http://localhost:4000/api/metrics/orders-by-date", {
  headers,
  params: {
    start: "2025-09-09", // ✅ Chart will start from this date
  },
})
.then((res) => {
  console.log("📦 Raw orders response:", res.data);

  const raw = res.data?.series || res.data?.data || res.data || [];
  const arr = Array.isArray(raw) ? raw : [];

  const parsed = arr
    .map((o) => {
      const date =
        o.date ||
        o.order_date ||
        o.orderDate ||
        o.createdAt ||
        o.createdAtShopify ||
        o.order_date_str ||
        null;

      const revenue =
        (o.revenue !== undefined ? Number(o.revenue) : undefined) ??
        (o.daily_revenue !== undefined ? Number(o.daily_revenue) : undefined) ??
        (o.totalRevenue !== undefined ? Number(o.totalRevenue) : undefined) ??
        (o.total_price !== undefined ? Number(o.total_price) : undefined);

      const orders =
        (o.orders !== undefined ? Number(o.orders) : undefined) ??
        (o.count !== undefined ? Number(o.count) : undefined) ??
        (o.order_count !== undefined ? Number(o.order_count) : undefined);

      return {
        date: date ? new Date(date).toISOString().slice(0, 10) : null,
        revenue: revenue ?? 0,
        orders: orders ?? 0,
      };
    })
    .filter((x) => x.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log("✅ Parsed orders:", parsed);
  setOrdersByDate(parsed);
})
.catch((err) => {
  console.error("❌ Failed to fetch orders by date:", err);
  setOrdersByDate([]);
});


    axios
      .get("http://localhost:4000/api/metrics/top-customers", { headers })
      .then((res) => {
        const raw = res.data?.topCustomers ?? res.data ?? [];
        const normalized = (Array.isArray(raw) ? raw : []).map((c) => ({
          id: c.id,
          firstName: c.firstName ?? c.first_name ?? c.name ?? "",
          lastName: c.lastName ?? c.last_name ?? "",
          email: c.email ?? "",
          totalSpent: Number(c.totalSpent ?? c.total_spent ?? 0),
        }));
        setTopCustomers(normalized);
      })
      .catch((err) => {
        console.error("❌ Failed to fetch top customers:", err);
        setTopCustomers([]);
      });
  }, [token]);

  const labels = ordersByDate.map((o) => formatDateLabel(o.date));
  const ordersData = ordersByDate.map((o) => Number(o.orders || 0));
  const revenueData = ordersByDate.map((o) => Number(o.revenue || 0));

  const showOrders = ordersData.some((v) => v > 0);
  const showRevenue = revenueData.some((v) => v > 0);

  const lineDatasets = [];
  if (showOrders) {
    lineDatasets.push({
      label: "Orders",
      data: ordersData,
      borderColor: "#28a745",
      backgroundColor: "rgba(40,167,69,0.08)",
      borderWidth: 2.5,
      tension: 0.35,
      pointRadius: 4,
      yAxisID: "y",
    });
  }
  if (showRevenue) {
    lineDatasets.push({
      label: "Revenue",
      data: revenueData,
      borderColor: "#667eea",
      backgroundColor: "rgba(102,126,234,0.12)",
      borderWidth: 2.5,
      tension: 0.35,
      pointRadius: 3,
      yAxisID: "y1",
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          background: "white",
          padding: "20px",
          borderRadius: "15px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#333",
              margin: 0,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Dashboard
          </h1>
          <p style={{ color: "#666", margin: "5px 0 0 0", fontSize: "16px" }}>
            Welcome to your Trendzy Analytics Dashboard
          </p>
        </div>
        <button
          onClick={logout}
          style={{
            background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "10px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s",
            boxShadow: "0 4px 15px rgba(255, 107, 107, 0.3)",
          }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20,
          marginBottom: 30,
        }}
      >
        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 12,
            textAlign: "center",
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 14, color: "#666" }}>Total Customers</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#667eea" }}>
            {summary.totalCustomers ?? 0}
          </div>
        </div>
        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 12,
            textAlign: "center",
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 14, color: "#666" }}>Total Orders</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#28a745" }}>
            {summary.totalOrders ?? 0}
          </div>
        </div>
        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 12,
            textAlign: "center",
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 14, color: "#666" }}>Total Revenue</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#007bff" }}>
            {inr.format(summary.totalRevenue ?? 0)}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "white",
          padding: 30,
          borderRadius: 15,
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          marginBottom: 30,
          border: "1px solid #f0f0f0",
          minHeight: 340,
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "#333",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              width: 8,
              height: 8,
              borderRadius: "50%",
              display: "inline-block",
            }}
          />
          Orders by Date
        </h2>

        {ordersByDate.length === 0 ? (
  <div style={{ color: "#666" }}>
    No order data available <br />
    <pre
      style={{
        fontSize: "12px",
        background: "#f9f9f9",
        padding: "10px",
        borderRadius: "6px",
        maxHeight: "120px",
        overflow: "auto",
      }}
    >
      Debug: {JSON.stringify(ordersByDate, null, 2)}
    </pre>
  </div>
) : (
  <div
    style={{
      height: "300px",
      width: "100%",
      position: "relative",
    }}
  >
    <Line
      data={{
        labels,
        datasets: lineDatasets,
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const label = ctx.dataset.label || "";
                const val = ctx.parsed.y ?? 0;
                return label === "Revenue"
                  ? inr.format(val)
                  : `${label}: ${val}`;
              },
            },
          },
          title: { display: false },
        },
        scales: {
          x: {
            type: "category",
            grid: { color: "#f0f0f0" },
            ticks: {
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: 10,
            },
          },
          y: {
            type: "linear",
            display: showOrders,
            position: "left",
            beginAtZero: true,
            grid: { color: "#f0f0f0" },
            ticks: {
              stepSize: 1,
              precision: 0,
            },
          },
          y1: {
            type: "linear",
            display: showRevenue,
            position: "right",
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            ticks: {
              callback: (v) => inr.format(Number(v)),
            },
          },
        },
      }}
    />
  </div>
)}

      </div>



      <div
        style={{
          background: "white",
          padding: 30,
          borderRadius: 15,
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          border: "1px solid #f0f0f0",
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "#333",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              width: 8,
              height: 8,
              borderRadius: "50%",
              display: "inline-block",
            }}
          />
          Top Customers by Spend
        </h2>

        <Bar
          data={{
            labels: topCustomers.map((c) =>
              `${c.firstName} ${c.lastName}`.trim() || c.email || "Unknown"
            ),
            datasets: [
              {
                label: "Total Spent",
                data: topCustomers.map((c) => Number(c.totalSpent || 0)),
                backgroundColor: "rgba(240, 147, 251, 0.85)",
                borderColor: "#f093fb",
                borderWidth: 2,
                borderRadius: 8,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) =>
                    `${inr.format(Number(ctx.parsed.y || 0))}`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: "#f0f0f0" },
                ticks: {
                  callback: (val) => inr.format(Number(val)),
                },
              },
              x: {
                grid: { color: "#f0f0f0" },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
