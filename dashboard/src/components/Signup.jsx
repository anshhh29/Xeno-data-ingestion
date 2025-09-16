import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    shopDomain: "",
    shopAccessToken: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      if (data.token) {
        login(data.token);
        navigate("/");
      } else {
        setError("No token returned from server");
      }
    } catch (err) {
      console.error("Signup error", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          padding: "40px",
          width: "100%",
          maxWidth: "500px",
          position: "relative",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#333" }}>
            Create Account
          </h1>
          <p style={{ color: "#666", fontSize: "16px" }}>
            Join us and start your journey
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fee",
              border: "1px solid #fcc",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "20px",
              color: "#c33",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
            style={{ width: "100%", marginBottom: "15px", padding: "10px" }}
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            style={{ width: "100%", marginBottom: "15px", padding: "10px" }}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            style={{ width: "100%", marginBottom: "15px", padding: "10px" }}
          />

          <input
            type="text"
            name="shopDomain"
            placeholder="Shopify Domain (myshopify.com)"
            value={form.shopDomain}
            onChange={handleChange}
            required
            style={{ width: "100%", marginBottom: "15px", padding: "10px" }}
          />

          <input
            type="password"
            name="shopAccessToken"
            placeholder="Shopify Access Token"
            value={form.shopAccessToken}
            onChange={handleChange}
            required
            style={{ width: "100%", marginBottom: "20px", padding: "10px" }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#ccc" : "#667eea",
              color: "white",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p style={{ marginTop: "20px", textAlign: "center" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#667eea", fontWeight: "600" }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
