const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function getJwtConfiguration() {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN;

  if (!secret || !expiresIn) {
    throw new Error("JWT_SECRET and JWT_EXPIRES_IN must be configured.");
  }

  return { secret, expiresIn };
}

function generateToken(userId) {
  const { secret, expiresIn } = getJwtConfiguration();
  return jwt.sign({ userId }, secret, { expiresIn });
}

function toSafeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function hasRequiredFields(...fields) {
  return fields.every((field) => typeof field === "string" && field.trim());
}

async function signup(req, res) {
  const { name, email, phone, password } = req.body || {};

  if (!hasRequiredFields(name, email, phone, password)) {
    return res.status(400).json({
      success: false,
      message: "Name, email, phone, and password are required.",
    });
  }

  try {
    getJwtConfiguration();

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      user: toSafeUser(user),
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Signup failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create account.",
    });
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!hasRequiredFields(email, password)) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    const isPasswordValid = user && (await bcrypt.compare(password, user.password));

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    return res.status(200).json({
      success: true,
      user: toSafeUser(user),
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to log in.",
    });
  }
}

module.exports = { login, signup };
