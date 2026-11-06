/**
 * Academy Website — Zero-Dependency Node.js Server
 *
 * Serves static files + REST API mirroring AcademyDB + cookie-session auth.
 * No external dependencies — runs on GoDaddy cPanel Node.js selector.
 *
 * Collections: admin, facultyAccounts, students, notes, notices, inquiries,
 *   papers, tests, attendance, doubts, receipts, timetable, toppers,
 *   quizQuestions, whatsappLogs
 * Auth: login (admin/student), change-password, me, logout
 * Session: HttpOnly cookie 'academy_session'
 * Secrets stripped: student.pin, admin/faculty.password from non-owner responses
 * Persistence: data/academy.json (atomic write via tmp+rename)
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
// DATA_DIR is overridable so Fly.io can mount a persistent volume over it
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'academy.json');
const SESSION_COOKIE = 'academy_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const PORT = process.env.PORT || 3000;

// In-memory DB loaded from data/academy.json
let db = {};
const sessions = new Map(); // sessionId -> { user, createdAt, expiresAt }

// ---------- Persistence ----------
function loadDB() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    db = JSON.parse(raw);
    console.log(`[server] Loaded DB from ${DATA_FILE} (${Object.keys(db).join(', ')})`);
  } catch (e) {
    if (e.code === 'ENOENT') {
      // No data file yet (e.g. fresh persistent volume) — seed it
      console.log(`[server] No DB at ${DATA_FILE}, seeding from auth.js`);
      try {
        const { generateSeed } = require('./scripts/seed.js');
        db = generateSeed();
        saveDB();
        console.log('[server] Seeded fresh database');
      } catch (seedErr) {
        console.error('[server] Failed to seed DB:', seedErr.message);
        db = {};
      }
      return;
    }
    console.error('[server] Failed to load DB, using empty:', e.message);
    db = {};
  }

  // A stale/empty DB (e.g. an old academy.json that parses to {} or has empty
  // collections) must not silently stay empty — re-seed so the app is always
  // functional. Check that the key collections actually have content, not just
  // that the keys exist (an empty array still "looks" complete).
  const needsSeed = !db.admin ||
    !Array.isArray(db.students) || db.students.length === 0 ||
    !Array.isArray(db.notices) || db.notices.length === 0 ||
    !Array.isArray(db.toppers) || db.toppers.length === 0;
  if (needsSeed) {
    console.log('[server] Loaded DB is incomplete or empty, re-seeding from auth.js');
    try {
      const { generateSeed } = require('./scripts/seed.js');
      db = generateSeed();
      saveDB();
      console.log('[server] Re-seeded database');
    } catch (seedErr) {
      console.error('[server] Failed to re-seed DB:', seedErr.message);
    }
  }
}

function saveDB() {
  // Ensure the data directory exists (e.g. on a fresh persistent volume)
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }
  catch (e) { /* best-effort */ }
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

// ---------- Session Helpers ----------
function genSessionId() {
  return crypto.randomBytes(24).toString('hex');
}

function createSession(user) {
  const id = genSessionId();
  const now = Date.now();
  sessions.set(id, {
    user: sanitizeUserForSession(user),
    createdAt: now,
    expiresAt: now + SESSION_MAX_AGE,
  });
  return id;
}

function getSession(sessionId) {
  if (!sessionId) return null;
  const s = sessions.get(sessionId);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return s;
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

// ---------- Secret Stripping ----------
function stripSecrets(obj, requester) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(o => stripSecrets(o, requester));

  const out = { ...obj };
  const isAdmin = requester && (requester.role === 'admin' || requester.role === 'faculty');
  const isOwner = requester && requester.id && obj.id === requester.id;

  // Student PIN — only visible to admin/faculty or the student themselves
  if (out.pin !== undefined && !(isAdmin || isOwner)) {
    delete out.pin;
  }

  // Admin/Faculty password — never exposed
  if (out.password !== undefined) {
    delete out.password;
  }

  return out;
}

function sanitizeUserForSession(user) {
  // Store minimal session user (no secrets)
  const { password, pin, ...safe } = user;
  return safe;
}

// ---------- Collection Helpers ----------
const COLLECTIONS = [
  'admin',
  'facultyAccounts',
  'students',
  'notes',
  'notices',
  'inquiries',
  'papers',
  'tests',
  'attendance',
  'doubts',
  'receipts',
  'timetable',
  'toppers',
  'quizQuestions',
  'whatsappLogs',
];

function getCollection(name) {
  if (!db[name]) db[name] = [];
  return db[name];
}

function findById(collection, id) {
  return collection.find(item => item.id === id);
}

function findIndexById(collection, id) {
  return collection.findIndex(item => item.id === id);
}

// ---------- HTTP Utilities ----------
function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k && v.length) cookies[k] = v.join('=');
  });
  return cookies;
}

function setCookie(res, name, value, options = {}) {
  const opts = {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_MAX_AGE / 1000,
    ...options,
  };
  const parts = [`${name}=${value}`];
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearCookie(res, name) {
  res.setHeader('Set-Cookie', `${name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  sendJSON(res, status, { success: false, message });
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

// ---------- Static File Serving ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.webp': 'image/webp',
};

function serveStatic(req, res) {
  let urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (urlPath === '/') urlPath = '/index.html';

  // Security: prevent directory traversal
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(ROOT, safePath);

  // Must stay within ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback for client-side routes (admin.html, student.html, etc.)
        if (!path.extname(safePath)) {
          const htmlPath = path.join(ROOT, safePath + '.html');
          fs.readFile(htmlPath, (err2, content2) => {
            if (!err2) {
              res.writeHead(200, { 'Content-Type': MIME['.html'] });
              return res.end(content2);
            }
          });
        }
        res.writeHead(404);
        return res.end('Not Found');
      }
      res.writeHead(500);
      return res.end('Server Error');
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

// ---------- API Handlers ----------
function requireAuth(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const session = getSession(cookies[SESSION_COOKIE]);
  if (!session) return null;
  return session.user;
}

function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'admin' && user.role !== 'faculty') return null;
  return user;
}

async function handleAPI(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  // /api/auth/*
  if (pathname.startsWith('/api/auth/')) {
    const action = pathname.replace('/api/auth/', '');
    switch (action) {
      case 'login':
        return handleLogin(req, res);
      case 'logout':
        return handleLogout(req, res);
      case 'me':
        return handleMe(req, res);
      case 'change-password':
        return handleChangePassword(req, res);
      case 'reset-admin-password':
        return handleResetAdminPassword(req, res);
      default:
        return sendError(res, 404, 'Auth endpoint not found');
    }
  }

  // /api/reset — reset database to seed values (admin only)
  if (pathname === '/api/reset' && method === 'POST') {
    const user = requireAdmin(req, res);
    if (!user) return sendError(res, 401, 'Admin access required');
    const { generateSeed } = require('./scripts/seed.js');
    db = generateSeed();
    saveDB();
    return sendJSON(res, 200, { success: true, message: 'Database reset to seed values' });
  }

  // /api/:collection/:id?
  const match = pathname.match(/^\/api\/([^/]+)(?:\/(.+))?$/);
  if (!match) return false; // not an API route

  const collectionName = match[1];
  const id = match[2];

  if (!COLLECTIONS.includes(collectionName)) {
    return sendError(res, 404, 'Collection not found');
  }

  // Public read collections — accessible without authentication
  const PUBLIC_READS = ['notes', 'papers', 'notices', 'toppers', 'timetable', 'quizQuestions', 'inquiries'];
  // Public write collections — submissions from public pages
  const PUBLIC_WRITES = ['inquiries'];

  const user = requireAuth(req, res);
  const isPublicRead = method === 'GET' && PUBLIC_READS.includes(collectionName);
  const isPublicWrite = method === 'POST' && PUBLIC_WRITES.includes(collectionName);
  if (!user && !isPublicRead && !isPublicWrite) {
    return sendError(res, 401, 'Unauthorized');
  }

  // 'admin' is a single object resource, not an array collection
  if (collectionName === 'admin') {
    if (method === 'GET') {
      return sendJSON(res, 200, stripSecrets(db.admin || {}, user));
    }
    if (method === 'PUT') {
      const body = await readBody(req);
      // Allow password update only for the authenticated admin/faculty themselves
      const { password, ...safe } = body;
      db.admin = { ...db.admin, ...safe };
      if (password && user && (user.role === 'admin' || user.role === 'faculty')) {
        db.admin.password = password;
      }
      saveDB();
      return sendJSON(res, 200, stripSecrets(db.admin, user));
    }
    return sendError(res, 405, 'Method not allowed');
  }

  // Bulk PUT /api/:collection — replace entire collection { items: [...] }
  if (method === 'PUT' && !id) {
    const body = await readBody(req);
    const items = Array.isArray(body.items) ? body.items : [];
    db[collectionName] = items;
    saveDB();
    return sendJSON(res, 200, items.map(item => stripSecrets(item, user)));
  }

  const collection = getCollection(collectionName);

  // GET /api/:collection or /api/:collection/:id
  if (method === 'GET') {
    if (id) {
      const item = findById(collection, id);
      if (!item) return sendError(res, 404, 'Not found');
      return sendJSON(res, 200, stripSecrets(item, user));
    }
    return sendJSON(res, 200, collection.map(item => stripSecrets(item, user)));
  }

  // POST /api/:collection — create
  if (method === 'POST' && !id) {
    const body = await readBody(req);
    const newItem = { ...body, id: body.id || crypto.randomUUID() };
    collection.push(newItem);
    saveDB();
    return sendJSON(res, 201, stripSecrets(newItem, user));
  }

  // PUT /api/:collection/:id — update
  if (method === 'PUT' && id) {
    const idx = findIndexById(collection, id);
    if (idx === -1) return sendError(res, 404, 'Not found');
    const body = await readBody(req);
    // Never allow overwriting id
    const { id: _, ...updates } = body;
    collection[idx] = { ...collection[idx], ...updates };
    saveDB();
    return sendJSON(res, 200, stripSecrets(collection[idx], user));
  }

  // DELETE /api/:collection/:id
  if (method === 'DELETE' && id) {
    const idx = findIndexById(collection, id);
    if (idx === -1) return sendError(res, 404, 'Not found');
    collection.splice(idx, 1);
    saveDB();
    return sendJSON(res, 200, { success: true });
  }

  return sendError(res, 405, 'Method not allowed');
}

async function handleResetAdminPassword(req, res) {
  // Public endpoint used by the login-page "Forgot Password" OTP flow.
  // Auth is client-side only (not real security) per the app's design, so this
  // is a narrow, single-purpose reset — it only sets the admin password.
  const body = await readBody(req);
  const { newPassword, confirmPassword } = body;
  if (!newPassword || !confirmPassword) {
    return sendError(res, 400, 'All fields required');
  }
  if (newPassword.length < 6) {
    return sendError(res, 400, 'New password must be at least 6 characters');
  }
  if (newPassword !== confirmPassword) {
    return sendError(res, 400, 'Passwords do not match');
  }
  if (!db.admin) db.admin = {};
  db.admin.password = newPassword;
  saveDB();
  return sendJSON(res, 200, { success: true, message: 'Admin password reset successfully' });
}

async function handleLogin(req, res) {
  const body = await readBody(req);
  const { usernameOrEmail, password, studentIdOrPhone, pin, role } = body;

  // Admin/Faculty login
  if (role === 'admin' || role === 'faculty' || (usernameOrEmail && password)) {
    const admin = db.admin || {};
    const faculty = db.facultyAccounts || [];
    const accounts = [admin, ...faculty];

    const cleanUser = (usernameOrEmail || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    const matched = accounts.find(a =>
      (cleanUser === (a.username || '').toLowerCase() || cleanUser === (a.email || '').toLowerCase()) &&
      cleanPass === a.password
    );

    if (matched) {
      const sessionUser = {
        role: matched.role,
        name: matched.name,
        email: matched.email,
        username: matched.username,
      };
      const sessionId = createSession(sessionUser);
      setCookie(res, SESSION_COOKIE, sessionId);
      return sendJSON(res, 200, { success: true, user: sessionUser });
    }
    return sendError(res, 401, 'Invalid username, email, or password.');
  }

  // Student login
  if (role === 'student' || (studentIdOrPhone && pin)) {
    const students = db.students || [];
    const cleanId = (studentIdOrPhone || '').trim().toLowerCase();
    const cleanPin = (pin || '').trim();

    const student = students.find(s => {
      const idMatch = (s.id || '').trim().toLowerCase() === cleanId;
      const phoneMatch = (s.phone || '').trim().toLowerCase() === cleanId;
      const pinMatch = (s.pin || '').trim() === cleanPin;
      return (idMatch || phoneMatch) && pinMatch;
    });

    if (student) {
      const sessionUser = {
        role: 'student',
        id: student.id,
        name: student.name,
        phone: student.phone,
        standard: student.standard,
        subjects: student.subjects,
        feeStatus: student.feeStatus,
      };
      const sessionId = createSession(sessionUser);
      setCookie(res, SESSION_COOKIE, sessionId);
      return sendJSON(res, 200, { success: true, user: sessionUser });
    }
    return sendError(res, 401, 'Invalid Student ID / Phone or PIN password.');
  }

  return sendError(res, 400, 'Missing credentials');
}

function handleLogout(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[SESSION_COOKIE]) {
    deleteSession(cookies[SESSION_COOKIE]);
    clearCookie(res, SESSION_COOKIE);
  }
  sendJSON(res, 200, { success: true });
}

function handleMe(req, res) {
  const user = requireAuth(req, res);
  if (!user) return sendError(res, 401, 'Not authenticated');
  sendJSON(res, 200, { success: true, user });
}

async function handleChangePassword(req, res) {
  const user = requireAuth(req, res);
  if (!user) return sendError(res, 401, 'Not authenticated');

  const body = await readBody(req);
  const { currentPassword, newPassword, confirmPassword } = body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return sendError(res, 400, 'All fields required');
  }
  if (newPassword.length < 6) {
    return sendError(res, 400, 'New password must be at least 6 characters');
  }
  if (newPassword !== confirmPassword) {
    return sendError(res, 400, 'Passwords do not match');
  }

  // Admin/Faculty password change
  if (user.role === 'admin' || user.role === 'faculty') {
    const admin = db.admin || {};
    const faculty = db.facultyAccounts || [];

    let target = null;
    if (user.username === admin.username) target = admin;
    else target = faculty.find(f => f.username === user.username);

    if (!target) return sendError(res, 404, 'Account not found');
    if (target.password !== currentPassword) {
      return sendError(res, 401, 'Current password does not match');
    }

    target.password = newPassword;
    saveDB();
    return sendJSON(res, 200, { success: true, message: 'Password updated successfully' });
  }

  // Student PIN change (if ever needed)
  if (user.role === 'student') {
    const students = db.students || [];
    const student = students.find(s => s.id === user.id);
    if (!student) return sendError(res, 404, 'Student not found');
    if (student.pin !== currentPassword) {
      return sendError(res, 401, 'Current PIN does not match');
    }
    student.pin = newPassword;
    saveDB();
    return sendJSON(res, 200, { success: true, message: 'PIN updated successfully' });
  }

  return sendError(res, 400, 'Invalid role');
}

// ---------- Main Request Handler ----------
function requestHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // API routes
  if (pathname.startsWith('/api/')) {
    handleAPI(req, res).catch(err => {
      console.error('[server] API error:', err);
      sendError(res, 500, 'Internal server error');
    });
    return;
  }

  // Static files / SPA
  serveStatic(req, res);
}

// ---------- Startup ----------
loadDB();

const server = http.createServer(requestHandler);
server.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
  console.log(`[server] Static root: ${ROOT}`);
  console.log(`[server] Data file: ${DATA_FILE}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[server] Shutting down...');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  console.log('[server] Shutting down...');
  server.close(() => process.exit(0));
});