const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Tenant } = require("../models");

const router = express.Router();

// ----------------- SIGNUP -----------------
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, shopDomain, shopAccessToken } = req.body;
 
    console.log("helo world 1")

    if (!name || !email || !password || !shopDomain || !shopAccessToken) {
      return res.status(400).json({ error: "All fields are required" });
    }

    
    console.log("helo world 2")

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    
    console.log("helo world 3")

    // Check if tenant already exists
    let tenant = await Tenant.findOne({ where: { shopDomain } });
    if (!tenant) {
      tenant = await Tenant.create({
        name,
        shopDomain,
        shopAccessToken,
      });
    }

    

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      passwordHash,
      tenantId: tenant.id,
      role: "admin",
    });

    // Create JWT
    const token = jwt.sign(
      { userId: user.id, tenantId: tenant.id, role: user.role },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "7d" }
    );

    res.json({ token, tenantId: tenant.id });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// ----------------- LOGIN -----------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, role: user.role },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "7d" }
    );

    res.json({ token, tenantId: user.tenantId });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

module.exports = router;
