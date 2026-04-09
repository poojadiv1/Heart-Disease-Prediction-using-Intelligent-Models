const crypto = require("crypto");
const {
  createUser,
  getUserByUsername,
  createSession,
  getSession,
  deleteSession
} = require("./db");

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
}

function sanitizeUser(user) {
  return {
    id: user.id || user.user_id,
    username: user.username,
    createdAt: user.created_at || user.createdAt
  };
}

function registerUser(username, password) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
    throw new Error("Username must be 3-20 characters using letters, numbers, or underscore");
  }
  if (String(password || "").length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  if (getUserByUsername(normalizedUsername)) {
    throw new Error("Username already exists");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const user = createUser(normalizedUsername, passwordHash, salt);
  const token = crypto.randomBytes(32).toString("hex");
  createSession(token, user.id);

  return { token, user: sanitizeUser(user) };
}

function loginUser(username, password) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const user = getUserByUsername(normalizedUsername);
  if (!user) {
    throw new Error("Invalid username or password");
  }

  const passwordHash = hashPassword(password, user.salt);
  if (passwordHash !== user.password_hash) {
    throw new Error("Invalid username or password");
  }

  const token = crypto.randomBytes(32).toString("hex");
  createSession(token, user.id);

  return {
    token,
    user: sanitizeUser(user)
  };
}

function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return "";
}

function requireAuth(req) {
  const token = extractToken(req);
  if (!token) {
    throw new Error("Authentication required");
  }

  const session = getSession(token);
  if (!session) {
    throw new Error("Invalid session");
  }

  return {
    token,
    user: sanitizeUser(session)
  };
}

function logoutUser(req) {
  const token = extractToken(req);
  if (token) {
    deleteSession(token);
  }
}

module.exports = {
  registerUser,
  loginUser,
  requireAuth,
  logoutUser
};
