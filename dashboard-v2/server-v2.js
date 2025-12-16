require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const https = require('https');
const fileUpload = require('express-fileupload');
const { processGifUrls } = require('./auto_download_discord_gifs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsPath = path.join(__dirname, "../data/uploads");
    if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${timestamp}-${basename}${ext}`);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

const app = express();
// Middleware pour gérer les uploads de fichiers - DÉSACTIVÉ car conflit avec multer
// app.use(fileUpload({
//   limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
//   useTempFiles: false,
//   debug: false
// }));

const PORT = Number(process.env.DASHBOARD_PORT || process.env.PORT || 33002);

// Capture raw body for webhook signature validation (HMAC).
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({
  limit: '50mb',
  extended: true,
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// ========= Secrets (Freebox-friendly): load from file, auto-generate keys =========
function isBrokenSymlink(p) {
  try {
    const st = fs.lstatSync(p);
    if (!st.isSymbolicLink()) return false;
    // If it's a symlink, check target exists
    try {
      fs.statSync(p);
      return false;
    } catch {
      return true;
    }
  } catch {
    return false;
  }
}

function ensureWritableDir(dirPath) {
  if (!dirPath) return null;
  try {
    const p = path.resolve(dirPath);
    if (isBrokenSymlink(p)) return null;
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    fs.accessSync(p, fs.constants.W_OK);
    return p;
  } catch {
    return null;
  }
}

const DATA_DIR =
  ensureWritableDir(process.env.DATA_DIR) ||
  ensureWritableDir(path.join(__dirname, '../data')) ||
  ensureWritableDir(path.join(__dirname, './data')) ||
  ensureWritableDir(path.join(process.cwd(), '.data')) ||
  path.join(__dirname, './data'); // last resort (may fail later)

const DASHBOARD_SECRETS_PATH = process.env.DASHBOARD_SECRETS_PATH
  ? path.resolve(process.env.DASHBOARD_SECRETS_PATH)
  : path.join(DATA_DIR, 'dashboard-secrets.json');

function loadOrCreateSecrets() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DASHBOARD_SECRETS_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DASHBOARD_SECRETS_PATH, 'utf8'));
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
    const created = {
      createdAt: new Date().toISOString(),
      cookieSecret: crypto.randomBytes(48).toString('hex'),
      webhookSecret: crypto.randomBytes(32).toString('hex')
    };
    fs.writeFileSync(DASHBOARD_SECRETS_PATH, JSON.stringify(created, null, 2), 'utf8');
    return created;
  } catch (err) {
    console.error('⚠️ Failed to load/create dashboard secrets:', err);
    return {};
  }
}

const DASHBOARD_SECRETS = loadOrCreateSecrets();

// ========= Discord OAuth2 (login) =========
// IMPORTANT: Never embed OAuth client secret in the Android app.
// We can load it from:
// - process.env (dotenv / systemd / pm2)
// - PM2 process env (dashboard/bagbot) via getEnvFromBot()
// - dashboard-secrets.json (recommended for Freebox)
const DISCORD_OAUTH_REDIRECT_URI = (process.env.DISCORD_OAUTH_REDIRECT_URI || '').trim(); // optional: auto-derived from request if empty

async function getDiscordOAuthClientId() {
  return (
    (process.env.DISCORD_OAUTH_CLIENT_ID || '').trim() ||
    (process.env.CLIENT_ID || '').trim() ||
    (await getEnvFromBot('DISCORD_OAUTH_CLIENT_ID')) ||
    (await getEnvFromBot('CLIENT_ID')) ||
    (DASHBOARD_SECRETS.discordOAuthClientId || '').trim()
  );
}

async function getDiscordOAuthClientSecret() {
  return (
    (process.env.DISCORD_OAUTH_CLIENT_SECRET || '').trim() ||
    (await getEnvFromBot('DISCORD_OAUTH_CLIENT_SECRET')) ||
    (DASHBOARD_SECRETS.discordOAuthClientSecret || '').trim()
  );
}

// ========= Session cookie (no .env token required for UI) =========
const COOKIE_NAME = 'dash_sid';
const COOKIE_TTL_MS = Number(process.env.DASHBOARD_SESSION_TTL_MS || 12 * 60 * 60 * 1000); // 12h
const SESSIONS = new Map(); // sid -> { userId, username, isAdmin, accessToken, expiresAt }

// ========= Mobile token auth (Bearer) =========
// The Android app uses a signed Bearer token (HMAC) instead of cookies.
// Server issues it after Discord OAuth2 check; app sends it in Authorization header.
const MOBILE_TOKEN_TTL_MS = Number(process.env.DASHBOARD_MOBILE_TOKEN_TTL_MS || 7 * 24 * 60 * 60 * 1000); // 7 days

function base64UrlEncode(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function base64UrlDecode(str) {
  const s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s + pad, 'base64');
}
function signMobileToken(payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj), 'utf8');
  const payloadB64 = base64UrlEncode(payload);
  const sig = crypto.createHmac('sha256', DASHBOARD_SECRETS.cookieSecret || 'fallback-secret')
    .update(payloadB64)
    .digest();
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}
function verifyMobileToken(token) {
  const t = String(token || '');
  const parts = t.split('.');
  if (parts.length !== 2) return { ok: false, error: 'Malformed token' };
  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto.createHmac('sha256', DASHBOARD_SECRETS.cookieSecret || 'fallback-secret')
    .update(payloadB64)
    .digest();
  const providedSig = base64UrlDecode(sigB64);
  if (providedSig.length !== expectedSig.length || !crypto.timingSafeEqual(providedSig, expectedSig)) {
    return { ok: false, error: 'Bad signature' };
  }
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));
  } catch {
    return { ok: false, error: 'Bad payload' };
  }
  if (!payload || typeof payload !== 'object') return { ok: false, error: 'Bad payload' };
  if (payload.exp && Date.now() > Number(payload.exp)) return { ok: false, error: 'Expired' };
  if (!payload.admin) return { ok: false, error: 'Not admin' };
  return { ok: true, payload };
}

function parseCookies(cookieHeader) {
  const out = {};
  const str = String(cookieHeader || '');
  if (!str) return out;
  for (const part of str.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function setCookie(res, name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path || '/'}`);
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  parts.push(`SameSite=${opts.sameSite || 'Lax'}`);
  if (opts.secure) parts.push('Secure');
  if (typeof opts.maxAge === 'number') parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearCookie(res, name) {
  setCookie(res, name, '', { maxAge: 0 });
}

function getSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies[COOKIE_NAME];
  if (!sid) return null;
  const sess = SESSIONS.get(sid);
  if (!sess) return null;
  if (sess.expiresAt && Date.now() > sess.expiresAt) {
    SESSIONS.delete(sid);
    return null;
  }
  return { sid, ...sess };
}

async function discordFetch(pathname, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(`https://discord.com/api/v10${pathname}`, {
    method,
    headers,
    body
  });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  return { ok: res.ok, status: res.status, data };
}

async function checkUserIsGuildAdmin(accessToken, guildId) {
  // Use /users/@me/guilds and check ADMINISTRATOR bit (0x8).
  const guilds = await discordFetch('/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!guilds.ok || !Array.isArray(guilds.data)) return { ok: false, error: 'Failed to fetch user guilds' };
  const entry = guilds.data.find(g => String(g.id) === String(guildId));
  if (!entry) return { ok: false, error: 'User is not in this guild' };
  const perms = BigInt(entry.permissions || 0);
  const isAdmin = (perms & 0x8n) === 0x8n;
  return { ok: true, isAdmin };
}

function wantsHtml(req) {
  const accept = String(req.headers.accept || '');
  return accept.includes('text/html');
}

// ========= Security: Discord-admin-only access (+ optional legacy Bearer token) =========
const DASHBOARD_ADMIN_TOKEN = (process.env.DASHBOARD_ADMIN_TOKEN || '').trim(); // legacy/automation fallback
function timingSafeEqualStr(a, b) {
  const aBuf = Buffer.from(String(a || ''), 'utf8');
  const bBuf = Buffer.from(String(b || ''), 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function hasBearerAdminToken(req) {
  if (!DASHBOARD_ADMIN_TOKEN) return false;
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  return !!(token && timingSafeEqualStr(token, DASHBOARD_ADMIN_TOKEN));
}

function isDiscordAdminSession(req) {
  const sess = getSession(req);
  return !!(sess && sess.isAdmin);
}

function requireAdminAuth(req, res, next) {
  // Allow if Discord session is admin
  if (isDiscordAdminSession(req)) return next();

  // Allow mobile Bearer token
  const header = String(req.headers.authorization || '');
  if (header.startsWith('Bearer ')) {
    const t = header.slice('Bearer '.length).trim();
    const v = verifyMobileToken(t);
    if (v.ok) {
      req.mobileAuth = v.payload;
      return next();
    }
  }

  // Allow optional legacy bearer token (automation)
  if (hasBearerAdminToken(req)) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// ========= Webhook (signed) =========
// POST /webhook/<action>
// Header: X-Signature: sha256=<hex>  (or just <hex>)
// Body: JSON, signature computed on raw bytes.
const WEBHOOK_SECRET = (process.env.DASHBOARD_WEBHOOK_SECRET || DASHBOARD_SECRETS.webhookSecret || '').trim();
function verifyWebhook(req, res, next) {
  if (!WEBHOOK_SECRET) return res.status(400).json({ error: 'Webhook disabled (missing DASHBOARD_WEBHOOK_SECRET)' });
  const header = String(req.headers['x-signature'] || req.headers['x-bag-signature'] || '');
  const provided = header.startsWith('sha256=') ? header.slice('sha256='.length) : header;
  const raw = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from('', 'utf8');
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
  if (!provided || !timingSafeEqualStr(provided, expected)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  return next();
}

// ========= Public auth routes =========
app.get('/login', (req, res) => {
  const sess = getSession(req);
  if (sess?.isAdmin) return res.redirect('/dash');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connexion Dashboard</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0d0d0d;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{background:#151515;border:1px solid #333;border-radius:12px;padding:24px;max-width:520px;width:92%}
a.btn{display:inline-block;background:#5865F2;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700}
.muted{color:#aaa;font-size:14px;line-height:1.4}
code{background:#222;padding:2px 6px;border-radius:6px}
</style></head>
<body><div class="card">
<h2>Connexion requise</h2>
<p class="muted">Accès réservé aux admins du serveur Discord configuré (<code>GUILD_ID</code>).</p>
<p><a class="btn" href="/auth/discord">Se connecter avec Discord</a></p>
<p class="muted">Si tu as changé l’URL/port, ouvre le dashboard via l’IP de ta Freebox.</p>
</div></body></html>`);
});

app.get('/auth/logout', (req, res) => {
  const sess = getSession(req);
  if (sess?.sid) SESSIONS.delete(sess.sid);
  clearCookie(res, COOKIE_NAME);
  res.redirect('/login');
});

app.get('/auth/discord', (req, res) => {
  (async () => {
    const clientId = await getDiscordOAuthClientId();
    const clientSecret = await getDiscordOAuthClientSecret();
    if (!clientId) return res.status(500).send('Missing DISCORD_OAUTH_CLIENT_ID (or CLIENT_ID).');
    if (!clientSecret) return res.status(500).send('Missing DISCORD_OAUTH_CLIENT_SECRET (set it in PM2 env or dashboard-secrets.json).');

    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http');
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`);
    const redirectUri = DISCORD_OAUTH_REDIRECT_URI || `${proto}://${host}/auth/discord/callback`;

    const state = crypto.randomBytes(18).toString('hex');
    // Keep state in-memory for 10 minutes
    SESSIONS.set(`state:${state}`, { createdAt: Date.now() });
    setTimeout(() => SESSIONS.delete(`state:${state}`), 10 * 60 * 1000).unref?.();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify guilds',
      state
    });
    return res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  })().catch((err) => {
    console.error('Error in /auth/discord:', err);
    res.status(500).send('Auth error');
  });
});

app.get('/auth/discord/callback', async (req, res) => {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const stateKey = `state:${state}`;
    const stateObj = SESSIONS.get(stateKey);
    SESSIONS.delete(stateKey);
    if (!code || !stateObj) return res.status(400).send('Invalid OAuth state.');

    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http');
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`);
    const redirectUri = DISCORD_OAUTH_REDIRECT_URI || `${proto}://${host}/auth/discord/callback`;

    const clientId = await getDiscordOAuthClientId();
    const clientSecret = await getDiscordOAuthClientSecret();
    if (!clientId || !clientSecret) return res.status(500).send('Discord OAuth is not configured.');

    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    });
    const tokenRes = await discordFetch('/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString()
    });
    if (!tokenRes.ok) {
      console.error('OAuth token exchange failed:', tokenRes.status, tokenRes.data);
      return res.status(502).send('OAuth token exchange failed.');
    }
    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) return res.status(502).send('Missing access token.');

    const me = await discordFetch('/users/@me', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!me.ok) return res.status(502).send('Failed to fetch user profile.');

    // Determine guild + admin
    const guildId = process.env.GUILD_ID || process.env.FORCE_GUILD_ID || '1360897918504271882';
    const permCheck = await checkUserIsGuildAdmin(accessToken, guildId);
    if (!permCheck.ok) return res.status(403).send(`Access denied: ${permCheck.error}`);
    if (!permCheck.isAdmin) return res.status(403).send('Access denied: you must be an admin of the Discord server.');

    const sid = crypto.randomBytes(24).toString('hex');
    SESSIONS.set(sid, {
      userId: me.data?.id,
      username: me.data?.username,
      isAdmin: true,
      accessToken,
      expiresAt: Date.now() + COOKIE_TTL_MS
    });
    setCookie(res, COOKIE_NAME, sid, { maxAge: COOKIE_TTL_MS / 1000 });
    return res.redirect('/dash');
  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.status(500).send('OAuth callback error.');
  }
});

// ========= Mobile OAuth start/callback =========
// Flow:
// - App opens:  GET <base>/auth/mobile/start?app_redirect=bagbot://auth
// - Server redirects to Discord authorize (redirect_uri is server callback)
// - Callback exchanges code, checks ADMINISTRATOR on GUILD_ID, then redirects to:
//   bagbot://auth?token=<bearer>&user=<username>
app.get('/auth/mobile/start', (req, res) => {
  const appRedirect = String(req.query.app_redirect || 'bagbot://auth');
  (async () => {
    const clientId = await getDiscordOAuthClientId();
    const clientSecret = await getDiscordOAuthClientSecret();
    if (!clientId || !clientSecret) {
      return res.status(500).send('Discord login is not configured (missing OAuth client id/secret).');
    }
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http');
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`);
    const redirectUri = `${proto}://${host}/auth/mobile/callback`;

    const state = crypto.randomBytes(18).toString('hex');
    SESSIONS.set(`mstate:${state}`, { createdAt: Date.now(), appRedirect });
    setTimeout(() => SESSIONS.delete(`mstate:${state}`), 10 * 60 * 1000).unref?.();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify guilds',
      state
    });
    return res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  })().catch((err) => {
    console.error('Error in /auth/mobile/start:', err);
    res.status(500).send('Auth error');
  });
});

app.get('/auth/mobile/callback', async (req, res) => {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const stateKey = `mstate:${state}`;
    const st = SESSIONS.get(stateKey);
    SESSIONS.delete(stateKey);
    if (!code || !st) return res.status(400).send('Invalid OAuth state.');

    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http');
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`);
    const redirectUri = `${proto}://${host}/auth/mobile/callback`;

    const clientId = await getDiscordOAuthClientId();
    const clientSecret = await getDiscordOAuthClientSecret();
    if (!clientId || !clientSecret) return res.status(500).send('Discord OAuth is not configured.');

    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    });
    const tokenRes = await discordFetch('/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString()
    });
    if (!tokenRes.ok) return res.status(502).send('OAuth token exchange failed.');
    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) return res.status(502).send('Missing access token.');

    const me = await discordFetch('/users/@me', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!me.ok) return res.status(502).send('Failed to fetch user profile.');

    const guildId = process.env.GUILD_ID || process.env.FORCE_GUILD_ID || '1360897918504271882';
    const permCheck = await checkUserIsGuildAdmin(accessToken, guildId);
    if (!permCheck.ok || !permCheck.isAdmin) return res.status(403).send('Access denied.');

    const mobileToken = signMobileToken({
      v: 1,
      admin: true,
      uid: me.data?.id,
      u: me.data?.username,
      gid: guildId,
      exp: Date.now() + MOBILE_TOKEN_TTL_MS
    });

    const appRedirect = String(st.appRedirect || 'bagbot://auth');
    const url = new URL(appRedirect);
    url.searchParams.set('token', mobileToken);
    if (me.data?.username) url.searchParams.set('user', me.data.username);
    // Some in-app browsers (e.g. Discord) can block direct redirects to custom schemes.
    // Return an HTML "Open app" page that attempts the redirect via JS + provides a fallback link.
    const target = url.toString();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html>
<html lang="fr"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ouvrir l'application</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0d0d0d;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
    .card{background:#151515;border:1px solid #333;border-radius:12px;padding:22px;max-width:560px;width:92%}
    a.btn{display:inline-block;background:#5865F2;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:800}
    .muted{color:#aaa;font-size:14px;line-height:1.4}
    code{background:#222;padding:2px 6px;border-radius:6px;word-break:break-all}
  </style>
  <script>
    // Try auto-open quickly
    setTimeout(function(){ window.location.href = ${JSON.stringify(target)}; }, 50);
  </script>
</head>
<body><div class="card">
  <h2>Connexion terminée</h2>
  <p class="muted">Si l'application ne s'ouvre pas automatiquement, appuie sur le bouton :</p>
  <p><a class="btn" href="${target}">Ouvrir l'app</a></p>
  <p class="muted">Lien (debug): <code>${target}</code></p>
</div></body></html>`);
  } catch (err) {
    console.error('Mobile OAuth callback error:', err);
    res.status(500).send('Mobile OAuth callback error.');
  }
});

app.get('/api/me', (req, res) => {
  const sess = getSession(req);
  if (sess) return res.json({ userId: sess.userId, username: sess.username, isAdmin: !!sess.isAdmin });
  const header = String(req.headers.authorization || '');
  if (header.startsWith('Bearer ')) {
    const t = header.slice('Bearer '.length).trim();
    const v = verifyMobileToken(t);
    if (v.ok) return res.json({ userId: v.payload.uid, username: v.payload.u, isAdmin: true, via: 'mobile_token' });
  }
  return res.status(401).json({ error: 'Not logged in' });
});

// ========= Global access guard =========
app.use((req, res, next) => {
  // Public endpoints
  if (req.path === '/health') return next();
  if (req.path === '/login') return next();
  if (req.path.startsWith('/auth/')) return next();
  if (req.path.startsWith('/webhook/')) return next(); // webhooks are validated separately

  // Allow Discord-admin session
  if (isDiscordAdminSession(req)) return next();

  // Allow mobile Bearer token
  const header = String(req.headers.authorization || '');
  if (header.startsWith('Bearer ')) {
    const t = header.slice('Bearer '.length).trim();
    const v = verifyMobileToken(t);
    if (v.ok) {
      req.mobileAuth = v.payload;
      return next();
    }
  }

  // Optional legacy token (automation / headless)
  if (hasBearerAdminToken(req)) return next();

  // Block everything else
  if (wantsHtml(req)) return res.redirect('/login');
  return res.status(401).json({ error: 'Unauthorized' });
});

// IMPORTANT: Routes spécifiques AVANT express.static pour éviter le cache

// Redirect old URLs to new dashboard
app.get(['/', '/index.html'], (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString()
  });
  // Servir directement index.html (dashboard principal)
  const htmlPath = path.join(__dirname, 'index.html');
  fs.readFile(htmlPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error loading dashboard');
    } else {
      res.type('html').send(data);
    }
  });
});

// Main dashboard on /dash
app.get('/dash', (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString()
  });
  // Force read from disk - no cache
  const htmlPath = path.join(__dirname, 'index.html');
  fs.readFile(htmlPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error loading dashboard');
    } else {
      res.type('html').send(data);
    }
  });
});

// Test cache page
app.get('/test-cache', (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.sendFile(path.join(__dirname, 'test-cache.html'));
});

// Music dashboard page
app.get("/music", (req, res) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  res.sendFile(path.join(__dirname, "music.html"));
});


// List backups
app.get('/backups', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ backups: [] });
    }
    
    const items = fs.readdirSync(BACKUP_DIR);
    const backups = [];
    
    for (const item of items) {
      // Filtrer les fichiers non pertinents
      if (item.startsWith('pre-restore-') || item.startsWith('td-queues-') || 
          item === 'auto-backup.log' || item === 'auto-restore.log' ||
          item === '_old_backups' || item === 'test-persistence.txt') {
        continue;
      }
      
      const itemPath = path.join(BACKUP_DIR, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isFile() && item.endsWith('.json')) {
        // Fichier JSON - afficher uniquement les vrais backups
        backups.push({
          filename: item,
          displayName: item,
          date: stats.mtime.toLocaleString('fr-FR'),
          size: (stats.size / 1024).toFixed(2) + ' KB',
          type: 'file',
          mtime: stats.mtime.getTime()
        });
      } else if (stats.isDirectory()) {
        // Répertoire de backup
        backups.push({
          filename: item,
          displayName: item,
          date: stats.mtime.toLocaleString('fr-FR'),
          size: 'Dossier',
          type: 'directory',
          mtime: stats.mtime.getTime()
        });
      }
    }
    
    // Trier par date de modification (plus récent en premier)
    backups.sort((a, b) => b.mtime - a.mtime);
    res.json({ backups });
  } catch (err) {
    console.error('Error listing backups:', err);
    res.json({ backups: [] });
  }
});

// Create backup
app.post('/backup', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup-${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, filename);
    
    const config = readConfig();
    fs.writeFileSync(backupPath, JSON.stringify(config, null, 2), 'utf8');
    
    res.json({ success: true, filename });
  } catch (err) {
    console.error('Error creating backup:', err);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Restore backup
app.post('/restore', (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }
    
    const backupPath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    // Create a backup of current config before restoring
    const currentBackupPath = path.join(BACKUP_DIR, `pre-restore-${Date.now()}.json`);
    fs.writeFileSync(currentBackupPath, fs.readFileSync(CONFIG, 'utf8'));
    
    // Restore the backup
    fs.writeFileSync(CONFIG, JSON.stringify(backupData, null, 2), 'utf8');
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error restoring backup:', err);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

// Bot control
function restartBot(res) {
  exec('pm2 restart bagbot', (error) => {
    if (error) console.error('Error restarting bot:', error);
  });
  return res.json({ success: true, message: 'Bot restart initiated' });
}
function deployCommands(res) {
  exec('node deploy-commands.js', (error) => {
    if (error) console.error('Error deploying commands:', error);
  });
  return res.json({ success: true, message: 'Command deployment initiated' });
}

app.post('/bot/control', requireAdminAuth, (req, res) => {
  try {
    const { action } = req.body;
    
    if (action === 'restart') {
      // Restart the bot using PM2
      return restartBot(res);
    } else if (action === 'deploy') {
      // Deploy commands
      return deployCommands(res);
    } else {
      res.status(400).json({ error: 'Unknown action' });
    }
  } catch (err) {
    console.error('Error in bot control:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Bot status info
app.get('/api/bot/status', (req, res) => {
  try {
    const { exec } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    // Compter les commandes
    const commandsPath = path.join(__dirname, '../src/commands');
    let commandCount = 0;
    try {
      const files = fs.readdirSync(commandsPath);
      commandCount = files.filter(f => f.endsWith('.js')).length;
    } catch (err) {
      console.error('Error counting commands:', err);
    }
    
    // Obtenir le statut PM2
    exec('pm2 jlist', (error, stdout, stderr) => {
      let botStatus = 'unknown';
      let restarts = 0;
      let uptime = 0;
      
      if (!error && stdout) {
        try {
          const processes = JSON.parse(stdout);
          const bagbot = processes.find(p => p.name === 'bagbot');
          if (bagbot) {
            botStatus = bagbot.pm2_env.status;
            restarts = bagbot.pm2_env.restart_time || 0;
            uptime = bagbot.pm2_env.pm_uptime || 0;
          }
        } catch (err) {
          console.error('Error parsing PM2 data:', err);
        }
      }
      
      // Lire la version du package.json
      let version = '2.0.0';
      try {
        const packagePath = path.join(__dirname, '../package.json');
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        version = packageData.version || '2.0.0';
      } catch (err) {
        console.error('Error reading package.json:', err);
      }
      
      res.json({
        status: botStatus,
        commandCount,
        restarts,
        uptime,
        version,
        dashboardVersion: 'v2.8'
      });
    });
  } catch (err) {
    console.error('Error getting bot status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route pour servir les GIFs hébergés localement
app.use('/gifs', express.static(path.join(__dirname, 'public/gifs')));

// Serve only dashboard files (avoid exposing project root).
app.use(express.static(__dirname));


const CONFIG = process.env.BAGBOT_CONFIG_PATH
  ? path.resolve(process.env.BAGBOT_CONFIG_PATH)
  : path.join(DATA_DIR, 'config.json');
const GUILD = process.env.GUILD_ID || process.env.FORCE_GUILD_ID || '1360897918504271882';
const BACKUP_DIR = process.env.BAGBOT_BACKUP_DIR
  ? path.resolve(process.env.BAGBOT_BACKUP_DIR)
  : '/var/data/backups';

// ========= Discord token retrieval (Freebox-friendly) =========
// Sources (in order):
// 1) process.env.DISCORD_TOKEN (typically loaded from /home/bagbot/Bag-bot/.env by dotenv)
// 2) PM2 process env (pm2 jlist) from "bagbot" or "dashboard"
let pm2EnvCache = null;
let pm2EnvCacheTime = 0;
const PM2_ENV_CACHE_MS = 30 * 1000;

function getPm2EnvCached() {
  const now = Date.now();
  if (pm2EnvCache && (now - pm2EnvCacheTime) < PM2_ENV_CACHE_MS) return Promise.resolve(pm2EnvCache);
  return new Promise((resolve) => {
    exec('pm2 jlist', (error, stdout) => {
      if (error || !stdout) {
        pm2EnvCache = null;
        pm2EnvCacheTime = now;
        return resolve(null);
      }
      try {
        const processes = JSON.parse(stdout);
        const envs = {};
        for (const name of ['bagbot', 'dashboard']) {
          const proc = processes.find(p => p?.name === name);
          const env = proc?.pm2_env?.env || proc?.pm2_env?.pm2_env || proc?.pm2_env || {};
          envs[name] = env;
        }
        pm2EnvCache = envs;
        pm2EnvCacheTime = now;
        return resolve(envs);
      } catch {
        pm2EnvCache = null;
        pm2EnvCacheTime = now;
        return resolve(null);
      }
    });
  });
}

async function getEnvFromBot(key) {
  if (process.env[key]) return process.env[key];
  const envs = await getPm2EnvCached();
  if (!envs) return undefined;
  return envs.bagbot?.[key] || envs.dashboard?.[key];
}

async function getDiscordBotToken() {
  return (await getEnvFromBot('DISCORD_TOKEN')) || '';
}

// Never log the token value.
getDiscordBotToken().then((t) => {
  if (!t) console.warn('⚠️ DISCORD_TOKEN introuvable (ni env, ni PM2). Les endpoints Discord API échoueront.');
}).catch(() => {});

// Cache for channel names
let channelsCache = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to read config
function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  } catch (err) {
    console.error('Error reading config:', err);
    return { guilds: {} };
  }
}

// Helper function to write config
function writeConfig(data) {
  try {
    fs.writeFileSync(CONFIG, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing config:', err);
    return false;
  }
}

// Fetch Discord channels
async function fetchDiscordChannels() {
  const token = await getDiscordBotToken();
  if (!token) throw new Error('DISCORD_TOKEN missing');
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v10/guilds/${GUILD}/channels`,
      method: 'GET',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const channels = JSON.parse(data);
          const result = {};
          channels.forEach(ch => result[ch.id] = ch.name);
          resolve(result);
        } else {
          reject(new Error(`Discord API error: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Fetch Discord roles
async function fetchDiscordRoles() {
  const token = await getDiscordBotToken();
  if (!token) throw new Error('DISCORD_TOKEN missing');
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v10/guilds/${GUILD}/roles`,
      method: 'GET',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const roles = JSON.parse(data);
          const result = {};
          roles.forEach(role => result[role.id] = role.name);
          resolve(result);
        } else {
          reject(new Error(`Discord API error: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Get channels with caching
async function getChannels() {
  const now = Date.now();
  if (channelsCache && (now - cacheTime) < CACHE_DURATION) {
    return channelsCache;
  }
  
  try {
    channelsCache = await fetchDiscordChannels();
    cacheTime = now;
    return channelsCache;
  } catch (err) {
    console.error('Error fetching channels:', err);
    return channelsCache || {};
  }
}

// Get roles with caching
let rolesCache = null;
let rolesCacheTime = 0;
async function getRoles() {
  const now = Date.now();
  if (rolesCache && (now - rolesCacheTime) < CACHE_DURATION) {
    return rolesCache;
  }
  
  try {
    rolesCache = await fetchDiscordRoles();
    rolesCacheTime = now;
    return rolesCache;
  } catch (err) {
    console.error('Error fetching roles:', err);
    return rolesCache || {};
  }
}

// Fetch Discord members with real names
async function fetchDiscordMembers() {
  const token = await getDiscordBotToken();
  if (!token) throw new Error('DISCORD_TOKEN missing');
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v10/guilds/${GUILD}/members?limit=1000`,
      method: 'GET',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    https.get(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        if (response.statusCode === 200) {
          const members = JSON.parse(data);
          const memberMap = {};
          const memberRolesMap = {};
          members.forEach(m => {
            // Prioriser: nick > global_name > username
            const displayName = m.nick || m.user?.global_name || m.user?.username || `User-${m.user?.id?.slice(-4)}`;
            memberMap[m.user?.id] = displayName;
            memberRolesMap[m.user?.id] = m.roles || [];
          });
          console.log('✅ Membres Discord récupérés:', Object.keys(memberMap).length);
          resolve({ names: memberMap, roles: memberRolesMap });
        } else {
          console.error('❌ Discord API error:', response.statusCode);
          reject(new Error(`Discord API error: ${response.statusCode}`));
        }
      });
    }).on('error', (err) => {
      console.error('❌ HTTPS request error:', err.message);
      reject(err);
    });
  });
}

// Get members with caching and fallback
let membersCache = null;
let membersCacheTime = 0;
async function getMembers() {
  const now = Date.now();
  if (membersCache && (now - membersCacheTime) < CACHE_DURATION) {
    console.log('🔄 Cache membres utilisé');
    return membersCache;
  }
  
  try {
    const fetchedData = await fetchDiscordMembers();
    // Rétro-compatibilité : si c'est le nouveau format avec names/roles
    if (fetchedData && fetchedData.names) {
      membersCache = fetchedData; // IMPORTANT: cacher TOUT l'objet (names + roles)
      membersCacheTime = now;
      return fetchedData; // Retourner tout l'objet pour avoir names ET roles
    } else {
      // Ancien format (juste les noms)
      const dataWithRoles = { names: fetchedData, roles: {} };
      membersCache = dataWithRoles;
      membersCacheTime = now;
      return dataWithRoles;
    }
  } catch (err) {
    console.error('⚠️ Erreur fetch membres Discord:', err.message);
    // Fallback: extraire depuis la config
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    const fallbackMap = {};
    
    if (guildConfig.economy && guildConfig.economy.balances) {
      Object.keys(guildConfig.economy.balances).forEach(userId => {
        if (!fallbackMap[userId]) fallbackMap[userId] = `User-${userId.slice(-4)}`;
      });
    }
    if (guildConfig.levels && guildConfig.levels.users) {
      Object.keys(guildConfig.levels.users).forEach(userId => {
        if (!fallbackMap[userId]) fallbackMap[userId] = `User-${userId.slice(-4)}`;
      });
    }
    
    console.log('⚠️ Fallback config utilisé:', Object.keys(fallbackMap).length, 'membres');
    return membersCache || fallbackMap;
  }
}

// Get full guild config - MAIN ENDPOINT FOR DASHBOARD
app.get('/api/configs', async (req, res) => {
  try {
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    // Récupérer les membres actuels du serveur
    const membersData = await getMembers();
    const currentMemberIds = Object.keys(membersData.names || membersData);
    
    // Filtrer économie pour ne garder que les membres actuels
    if (guildConfig.economy && guildConfig.economy.balances) {
      const filteredBalances = {};
      for (const [uid, data] of Object.entries(guildConfig.economy.balances)) {
        if (currentMemberIds.includes(uid)) {
          filteredBalances[uid] = data;
        }
      }
      guildConfig.economy.balances = filteredBalances;
      console.log(`[API] Économie filtrée: ${Object.keys(filteredBalances).length} membres actuels`);
    }
    
    // Filtrer niveaux/levels pour ne garder que les membres actuels
    if (guildConfig.levels && guildConfig.levels.users) {
      const filteredUsers = {};
      for (const [uid, data] of Object.entries(guildConfig.levels.users)) {
        if (currentMemberIds.includes(uid)) {
          filteredUsers[uid] = data;
        }
      }
      guildConfig.levels.users = filteredUsers;
      console.log(`[API] Niveaux/Levels.users filtrés: ${Object.keys(filteredUsers).length} membres actuels`);
    }
    if (guildConfig.niveaux) {
      const filteredNiveaux = {};
      for (const [uid, data] of Object.entries(guildConfig.niveaux)) {
        if (currentMemberIds.includes(uid)) {
          filteredNiveaux[uid] = data;
        }
      }
      guildConfig.niveaux = filteredNiveaux;
      console.log(`[API] Niveaux filtrés: ${Object.keys(filteredNiveaux).length} membres actuels`);
    }
    
    // Filtrer inactivité pour retirer exempts et ayant quitté
    if (guildConfig.autokick && guildConfig.autokick.inactivityTracking) {
      const excludedRoles = guildConfig.autokick.inactivityKick?.excludedRoleIds || [];
      const memberRoles = membersData.roles || {};
      console.log(`[API DEBUG] Excluded roles: ${excludedRoles.length}, Has memberRoles: ${Object.keys(memberRoles).length > 0}`);
      const filteredTracking = {};
      let exemptCount = 0;
      let leftCount = 0;
      for (const [uid, data] of Object.entries(guildConfig.autokick.inactivityTracking)) {
        if (!currentMemberIds.includes(uid)) {
          leftCount++;
          continue;
        }
        const roles = memberRoles[uid] || [];
        const hasExemptRole = excludedRoles.some(roleId => roles.includes(roleId));
        if (hasExemptRole) {
          exemptCount++;
          continue;
        }
        filteredTracking[uid] = data;
      }
      guildConfig.autokick.inactivityTracking = filteredTracking;
      console.log(`[API] Inactivité filtrée: ${Object.keys(filteredTracking).length} affichés (${exemptCount} exempts, ${leftCount} partis)`);
    }

    
    // Add channel names if requested
    if (req.query.include_channels === 'true') {
      const channels = await getChannels();
      guildConfig._channels = channels;
    }
    
    res.json(guildConfig);
  } catch (err) {
    console.error('Error in /api/configs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Replace full guild config (mobile-friendly "edit everything")
// Body must be the guild config object (not wrapped).
app.put('/api/configs', requireAdminAuth, (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'JSON body required' });
    }
    const config = readConfig();
    if (!config.guilds) config.guilds = {};
    config.guilds[GUILD] = req.body;
    if (writeConfig(config)) {
      return res.json({ success: true });
    }
    return res.status(500).json({ error: 'Failed to save config' });
  } catch (err) {
    console.error('Error in PUT /api/configs:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Discord channels
app.get('/api/discord/channels', async (req, res) => {
  try {
    const channels = await getChannels();
    res.json(channels);
  } catch (err) {
    console.error('Error fetching Discord channels:', err);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Get Discord roles
app.get('/api/discord/roles', async (req, res) => {
  try {
    const roles = await getRoles();
    res.json(roles);
  } catch (err) {
    console.error('Error fetching Discord roles:', err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get Discord members
app.get('/api/discord/members', async (req, res) => {
  try {
    const members = await getMembers();
    res.json(members);
  } catch (err) {
    console.error('Error in /api/discord/members:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Legacy endpoints for backward compatibility
app.get('/api/config', (req, res) => {
  try {
    const config = readConfig();
    res.json(config.guilds[GUILD] || {});
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/config/:section', (req, res) => {
  try {
    const config = readConfig();
    const section = req.params.section;
    res.json(config.guilds[GUILD]?.[section] || {});
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inactivity config (format bot)
app.get('/api/inactivity', async (req, res) => {
  try {
    const config = readConfig();
    const autokick = config.guilds[GUILD]?.autokick || {};
    const inactivityKick = autokick.inactivityKick || {
      enabled: false,
      delayDays: 30,
      excludedRoleIds: [],
      inactiveRoleId: null // Rôle donné aux membres qui déclarent une inactivité
    };
    
    // Ajouter le tracking des membres
    const tracking = autokick.inactivityTracking || {};
    
    
    // FILTRER exempts et ayant quitté
    const membersData = await getMembers();
    const currentMemberIds = Object.keys(membersData.names || membersData);
    const excludedRoles = inactivityKick.excludedRoleIds || [];
    const memberRoles = membersData.roles || {};
    const filteredTracking = {};
    for (const [uid, data] of Object.entries(tracking)) {
      if (!currentMemberIds.includes(uid)) continue;
      const roles = memberRoles[uid] || [];
      if (excludedRoles.some(r => roles.includes(r))) continue;
      filteredTracking[uid] = data;
    }
    console.log(`[API /inactivity] ${Object.keys(filteredTracking).length} affichés`);
    
    res.json({
      ...inactivityKick,
      tracking: filteredTracking
    });
  } catch (err) {
    console.error('Error in /api/inactivity:', err);
    res.status(500).json({ error: 'Failed to fetch inactivity config' });
  }
});

// Update inactivity config (format bot)
app.post('/api/inactivity', requireAdminAuth, (req, res) => {
  try {
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].autokick) config.guilds[GUILD].autokick = {};
    
    config.guilds[GUILD].autokick.inactivityKick = {
      enabled: !!req.body.enabled,
      delayDays: Number(req.body.delayDays) || 30,
      excludedRoleIds: Array.isArray(req.body.excludedRoleIds) ? req.body.excludedRoleIds : [],
      inactiveRoleId: req.body.inactiveRoleId || null
    };
    
    // Initialiser inactivityTracking si nécessaire
    if (!config.guilds[GUILD].autokick.inactivityTracking) {
      config.guilds[GUILD].autokick.inactivityTracking = {};
    }
    
    if (writeConfig(config)) {
      console.log('✅ Inactivity config updated');
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save config' });
    }
  } catch (err) {
    console.error('Error in POST /api/inactivity:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cleanup inactivity tracking - remove members who left
app.post('/api/inactivity/cleanup', requireAdminAuth, (req, res) => {
  try {
    const { removeIds } = req.body;
    if (!Array.isArray(removeIds) || removeIds.length === 0) {
      return res.json({ success: true, removed: 0 });
    }
    
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].autokick) config.guilds[GUILD].autokick = {};
    if (!config.guilds[GUILD].autokick.inactivityTracking) {
      config.guilds[GUILD].autokick.inactivityTracking = {};
    }
    
    const tracking = config.guilds[GUILD].autokick.inactivityTracking;
    let removed = 0;
    
    for (const id of removeIds) {
      if (tracking[id]) {
        delete tracking[id];
        removed++;
      }
    }
    
    if (removed > 0 && writeConfig(config)) {
      console.log(`✅ Inactivity cleanup: ${removed} ancien(s) membre(s) retiré(s)`);
      res.json({ success: true, removed });
    } else {
      res.json({ success: true, removed: 0 });
    }
  } catch (err) {
    console.error('Error in POST /api/inactivity/cleanup:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Réinitialiser l inactivité d un membre spécifique
app.post("/api/inactivity/reset/:userId", requireAdminAuth, (req, res) => {
  try {
    const { userId } = req.params;
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].autokick) config.guilds[GUILD].autokick = {};
    if (!config.guilds[GUILD].autokick.inactivityTracking) {
      config.guilds[GUILD].autokick.inactivityTracking = {};
    }
    const tracking = config.guilds[GUILD].autokick.inactivityTracking;
    if (!tracking[userId]) {
      return res.status(404).json({ error: "Member not tracked" });
    }
    tracking[userId].lastActivity = Date.now();
    if (writeConfig(config)) {
      console.log(`✅ Inactivité réinitialisée pour ${userId}`);
      res.json({ success: true, userId, lastActivity: tracking[userId].lastActivity });
    } else {
      res.status(500).json({ error: "Failed to save config" });
    }
  } catch (err) {
    console.error("Error in POST /api/inactivity/reset:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Ajouter automatiquement tous les membres au tracking  
app.post("/api/inactivity/add-all-members", requireAdminAuth, async (req, res) => {
  try {
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].autokick) config.guilds[GUILD].autokick = {};
    if (!config.guilds[GUILD].autokick.inactivityTracking) {
      config.guilds[GUILD].autokick.inactivityTracking = {};
    }
    const tracking = config.guilds[GUILD].autokick.inactivityTracking;
    const membersData = await getMembers();
    const memberNames = membersData.names || membersData;
    const knownBots = ["BoobBot", "DISBOARD", "DraftBot", "Mudae", "Invite Tracker", "Counting", "Tickets", "UnoOnDisc", "Bagbot"];
    let added = 0;
    const now = Date.now();
    for (const [userId, name] of Object.entries(memberNames)) {
      const isBot = knownBots.some(bot => name.toLowerCase().includes(bot.toLowerCase()));
      if (isBot) continue;
      if (!tracking[userId]) {
        tracking[userId] = { lastActivity: now };
        added++;
      }
    }
    if (added > 0 && writeConfig(config)) {
      console.log(`✅ ${added} nouveau(x) membre(s) ajouté(s) au tracking`);
      res.json({ success: true, added });
    } else {
      res.json({ success: true, added: 0 });
    }
  } catch (err) {
    console.error("Error in POST /api/inactivity/add-all-members:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



// Update economy settings
app.post('/api/economy', requireAdminAuth, (req, res) => {
  try {
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].economy) config.guilds[GUILD].economy = {};
    
    if (req.body.settings) {
      config.guilds[GUILD].economy.settings = {
        ...config.guilds[GUILD].economy.settings,
        ...req.body.settings
      };
    }
    
    if (req.body.currency) {
      config.guilds[GUILD].economy.currency = {
        ...config.guilds[GUILD].economy.currency,
        ...req.body.currency
      };
    }
    
    console.log('💾 Appel writeConfig...');
    if (writeConfig(config)) {
      console.log('✅ writeConfig réussi');
      res.json({ success: true });
    } else {
      console.error('❌ writeConfig échoué');
      res.status(500).json({ error: 'Failed to save config' });
    }
  } catch (err) {
    console.error('Error updating economy:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update actions (GIFs, messages, config)
app.post('/api/actions', requireAdminAuth, async (req, res) => {
  try {
    const { messages, config: actConfig } = req.body;
    let gifs = req.body.gifs;
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].economy) config.guilds[GUILD].economy = {};
    if (!config.guilds[GUILD].economy.actions) config.guilds[GUILD].economy.actions = {};
    
    // Update GIFs if provided
    if (gifs !== undefined) {
      // ⚠️ Traitement désactivé côté serveur - le client s'en charge déjà
      // console.log('📥 Traitement des GIFs Discord CDN...');
      // gifs = await processGifUrls(gifs);
      console.log('📥 Réception des GIFs (déjà traités par le client)');
      config.guilds[GUILD].economy.actions.gifs = gifs;
      console.log('✅ Actions GIFs updated (traités par le navigateur)');
    }
    
    // Update messages if provided
    if (messages !== undefined) {
      config.guilds[GUILD].economy.actions.messages = messages;
      console.log('✅ Actions messages updated');
    }
    
    // Update config if provided
    if (actConfig !== undefined) {
      config.guilds[GUILD].economy.actions.config = actConfig;
      console.log('✅ Actions config updated');
    }
    
    console.log('💾 Appel writeConfig...');
    if (writeConfig(config)) {
      console.log('✅ writeConfig réussi');
      res.json({ success: true });
    } else {
      console.error('❌ writeConfig échoué');
      res.status(500).json({ error: 'Failed to save config' });
    }
  } catch (err) {
    console.error('Error updating actions:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Update tickets configuration
app.post('/api/tickets', requireAdminAuth, (req, res) => {
  try {
    console.log('📥 POST /api/tickets - Reçu:', Object.keys(req.body));
    const config = readConfig();
    console.log('📖 Config lue, guilds:', Object.keys(config.guilds || {}));
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].tickets) config.guilds[GUILD].tickets = {};
    
    // Update categories if provided
    if (req.body.categories !== undefined) {
      console.log('🔄 Mise à jour categories, nombre:', req.body.categories.length);
      console.log('🔍 Première catégorie showCertified:', req.body.categories[0]?.showCertified);
      config.guilds[GUILD].tickets.categories = req.body.categories;
      console.log('✅ Tickets categories updated');
    }
    
    // Update panel if provided
    if (req.body.panel !== undefined) {
      config.guilds[GUILD].tickets.panel = req.body.panel;
      console.log('✅ Tickets panel updated');
    }
    
    // Update config if provided
    if (req.body.config !== undefined) {
      config.guilds[GUILD].tickets.config = req.body.config;
      console.log('✅ Tickets config updated');
    }
    
    // Update other ticket settings if provided
    if (req.body.settings) {
      config.guilds[GUILD].tickets = {
        ...config.guilds[GUILD].tickets,
        ...req.body.settings
      };
      console.log('✅ Tickets settings updated');
    }
    
    console.log('💾 Appel writeConfig...');
    if (writeConfig(config)) {
      console.log('✅ writeConfig réussi');
      res.json({ success: true });
    } else {
      console.error('❌ writeConfig échoué');
      res.status(500).json({ error: 'Failed to save config' });
    }
  } catch (err) {
    console.error('Error updating tickets:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reload bot config (arrête bot pendant sauvegarde, puis redémarre)
app.post('/api/bot/prepare-save', requireAdminAuth, (req, res) => {
  const { exec } = require('child_process');
  console.log('🛑 Arrêt du bot pour sauvegarde config...');
  exec('pm2 stop bagbot', (err, stdout, stderr) => {
    if (err) {
      console.error('❌ Erreur arrêt bot:', err);
      return res.status(500).json({ error: 'Échec arrêt' });
    }
    console.log('✅ Bot arrêté, prêt pour sauvegarde');
    res.json({ success: true });
  });
});

app.post('/api/bot/finish-save', requireAdminAuth, (req, res) => {
  const { exec } = require('child_process');
  console.log('▶️ Redémarrage du bot avec nouvelle config...');
  exec('pm2 restart bagbot', (err, stdout, stderr) => {
    if (err) {
      console.error('❌ Erreur redémarrage bot:', err);
      return res.status(500).json({ error: 'Échec redémarrage' });
    }
    console.log('✅ Bot redémarré avec config à jour');
    res.json({ success: true });
  });
});

// Update confess configuration
app.post('/api/confess', requireAdminAuth, (req, res) => {
  try {
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].confess) config.guilds[GUILD].confess = {};
    
    // Update confess settings
    if (req.body.settings) {
      config.guilds[GUILD].confess = {
        ...config.guilds[GUILD].confess,
        ...req.body.settings
      };
    }
    
    console.log('💾 Appel writeConfig...');
    if (writeConfig(config)) {
      console.log('✅ writeConfig réussi');
      res.json({ success: true });
    } else {
      console.error('❌ writeConfig échoué');
      res.status(500).json({ error: 'Failed to save config' });
    }
  } catch (err) {
    console.error('Error updating confess:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Load welcome/goodbye routes
require('./welcome-routes')(app, readConfig, writeConfig, GUILD);

// ========== API MUSIQUE ==========

// GET /api/music - Récupérer les playlists et uploads
// POST /api/music/playlist - Créer/modifier une playlist
app.post('/api/music/playlist', requireAdminAuth, (req, res) => {
  try {
    const { guildId, name, tracks } = req.body;
    const playlistsPath = path.join(__dirname, '../data/playlists');
    
    if (!fs.existsSync(playlistsPath)) {
      fs.mkdirSync(playlistsPath, { recursive: true });
    }
    
    const playlist = {
      name,
      guildId,
      tracks: tracks || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const filename = `${guildId}-${name.replace(/[^a-z0-9]/gi, '_')}.json`;
    fs.writeFileSync(path.join(playlistsPath, filename), JSON.stringify(playlist, null, 2));
    
    res.json({ ok: true, filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/music/upload - Upload un fichier audio

// DELETE /api/music/playlist/:guildId/:name
app.delete('/api/music/playlist/:guildId/:name', requireAdminAuth, (req, res) => {
  try {
    const { guildId, name } = req.params;
    const playlistsPath = path.join(__dirname, '../data/playlists');
    const filename = `${guildId}-${name.replace(/[^a-z0-9]/gi, '_')}.json`;
    const filepath = path.join(playlistsPath, filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ ok: true });
    } else {
      res.status(404).json({ error: 'Playlist non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== CONFIGURATION MULTER POUR UPLOADS ==========

app.get('/api/music', (req, res) => {
  try {
    const playlistsPath = path.join(__dirname, '../data/playlists');
    const uploadsPath = path.join(__dirname, '../data/uploads');
    
    const playlists = [];
    if (fs.existsSync(playlistsPath)) {
      fs.readdirSync(playlistsPath).forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, file), 'utf8'));
            playlists.push({
              name: data.name,
              guildId: data.guildId,
              trackCount: (data.tracks || []).length,
              updatedAt: data.updatedAt || Date.now()
            });
          } catch (e) {
            console.error(`Erreur lecture playlist ${file}:`, e);
          }
        }
      });
    }
    
    const uploads = [];
    let totalSize = 0;
    if (fs.existsSync(uploadsPath)) {
      fs.readdirSync(uploadsPath).forEach(file => {
        try {
          const stats = fs.statSync(path.join(uploadsPath, file));
          uploads.push({
            filename: file,
            size: stats.size,
            uploadedAt: stats.mtimeMs
          });
          totalSize += stats.size;
        } catch (e) {
          console.error(`Erreur stats ${file}:`, e);
        }
      });
    }
    
    res.json({ playlists, uploads, totalSize });
  } catch (error) {
    console.error('Erreur API /api/music:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/music/playlist/:guildId/:name - Détail d'une playlist
app.get('/api/music/playlist/:guildId/:name', (req, res) => {
  try {
    const { guildId, name } = req.params;
    const playlistsPath = path.join(__dirname, '../data/playlists');
    
    if (!fs.existsSync(playlistsPath)) {
      return res.status(404).json({ error: 'Aucune playlist' });
    }
    
    const files = fs.readdirSync(playlistsPath);
    const playlistFile = files.find(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
        return data.guildId === guildId && data.name === name;
      } catch (e) {
        return false;
      }
    });
    
    if (playlistFile) {
      const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, playlistFile), 'utf8'));
      res.json(data);
    } else {
      res.status(404).json({ error: 'Playlist non trouvée' });
    }
  } catch (error) {
    console.error('Erreur détail playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/music/upload - Upload fichier audio
app.post('/api/music/upload', requireAdminAuth, upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier' });
    }
    console.log('Fichier uploadé:', req.file.filename);
    res.json({ ok: true, filename: req.file.filename });
  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/music/upload/:filename - Supprimer un fichier uploadé
app.delete('/api/music/upload/:filename', requireAdminAuth, (req, res) => {
  try {
    const { filename } = req.params;
    const uploadsPath = path.join(__dirname, '../data/uploads');
    const filepath = path.join(uploadsPath, filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log('Fichier supprimé:', filename);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Fichier non trouvé' });
    }
  } catch (error) {
    console.error('Erreur suppression fichier:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/music/playlist/:guildId/:name - Renommer une playlist
app.put('/api/music/playlist/:guildId/:name', requireAdminAuth, (req, res) => {
  try {
    const { guildId, name } = req.params;
    const { newName } = req.body;
    
    if (!newName || newName.trim() === '') {
      return res.status(400).json({ error: 'Nouveau nom requis' });
    }
    
    const playlistsPath = path.join(__dirname, '../data/playlists');
    const files = fs.readdirSync(playlistsPath);
    
    const playlistFile = files.find(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
        return data.guildId === guildId && data.name === name;
      } catch (e) {
        return false;
      }
    });
    
    if (playlistFile) {
      const filepath = path.join(playlistsPath, playlistFile);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      // Vérifier qu'aucune autre playlist n'a ce nom
      const nameExists = files.some(f => {
        if (f === playlistFile) return false;
        try {
          const otherData = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
          return otherData.guildId === guildId && otherData.name === newName.trim();
        } catch (e) {
          return false;
        }
      });
      
      if (nameExists) {
        return res.status(400).json({ error: 'Une playlist avec ce nom existe déjà' });
      }
      
      data.name = newName.trim();
      data.updatedAt = Date.now();
      
      const newFilename = `${guildId}-${newName.trim().replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
      const newFilepath = path.join(playlistsPath, newFilename);
      
      fs.writeFileSync(newFilepath, JSON.stringify(data, null, 2));
      if (filepath !== newFilepath) {
        fs.unlinkSync(filepath);
      }
      
      console.log(`Playlist renommée: ${name} -> ${newName}`);
      res.json({ success: true, playlist: data });
    } else {
      res.status(404).json({ error: 'Playlist non trouvée' });
    }
  } catch (error) {
    console.error('Erreur renommage playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/music/playlist/:guildId/:name - Supprimer une playlist
app.delete('/api/music/playlist/:guildId/:name', requireAdminAuth, (req, res) => {
  try {
    const { guildId, name } = req.params;
    const playlistsPath = path.join(__dirname, '../data/playlists');
    
    const files = fs.readdirSync(playlistsPath);
    const playlistFile = files.find(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
        return data.guildId === guildId && data.name === name;
      } catch (e) {
        return false;
      }
    });
    
    if (playlistFile) {
      fs.unlinkSync(path.join(playlistsPath, playlistFile));
      console.log('Playlist supprimée:', name);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Playlist non trouvée' });
    }
  } catch (error) {
    console.error('Erreur suppression playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/music/playlist/:guildId/:name/track/:index - Supprimer une piste
app.delete('/api/music/playlist/:guildId/:name/track/:index', requireAdminAuth, (req, res) => {
  try {
    const { guildId, name, index } = req.params;
    const playlistsPath = path.join(__dirname, '../data/playlists');
    
    const files = fs.readdirSync(playlistsPath);
    const playlistFile = files.find(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
        return data.guildId === guildId && data.name === name;
      } catch (e) {
        return false;
      }
    });
    
    if (playlistFile) {
      const filepath = path.join(playlistsPath, playlistFile);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      const trackIndex = parseInt(index);
      if (trackIndex >= 0 && trackIndex < data.tracks.length) {
        const removedTrack = data.tracks.splice(trackIndex, 1)[0];
        data.updatedAt = Date.now();
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        console.log(`Piste supprimée: ${removedTrack.title}`);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Piste non trouvée' });
      }
    } else {
      res.status(404).json({ error: 'Playlist non trouvée' });
    }
  } catch (error) {
    console.error('Erreur suppression piste:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/music/add-link - Télécharger et ajouter un lien YouTube/Spotify à une playlist
app.post('/api/music/add-link', requireAdminAuth, async (req, res) => {
  try {
    const { link, playlistName, guildId } = req.body;
    
    if (!link || !playlistName || !guildId) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }
    
    console.log(`[Music Dashboard] Téléchargement ${link} pour playlist ${playlistName}`);
    
    const { spawn } = require('child_process');
    const uploadsPath = path.join(__dirname, '../data/uploads');
    
    // Créer le dossier uploads si nécessaire
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    
    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const outputTemplate = path.join(uploadsPath, `${timestamp}-%(title)s.%(ext)s`);
    
    // Télécharger avec yt-dlp
    const ytdlpPath = '/home/bagbot/yt-dlp';
    const ytdlpArgs = [
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '192k',
      '--output', outputTemplate,
      '--no-playlist',
      '--socket-timeout', '30',
      '--retries', '3',
      link
    ];
    
    const ytdlp = spawn(ytdlpPath, ytdlpArgs);
    let outputFile = null;
    let videoTitle = null;
    
    ytdlp.stdout.on('data', (data) => {
      const str = data.toString();
      console.log(`[yt-dlp] ${str}`);
      
      // Extraire le titre
      const titleMatch = str.match(/\[download\] Destination: (.+)/);
      if (titleMatch) {
        outputFile = path.basename(titleMatch[1].replace('.webm', '.mp3').replace('.m4a', '.mp3'));
      }
    });
    
    ytdlp.stderr.on('data', (data) => {
      console.error(`[yt-dlp stderr] ${data}`);
    });
    
    ytdlp.on('close', async (code) => {
      if (code === 0 && outputFile) {
        try {
          // Trouver le fichier téléchargé
          const files = fs.readdirSync(uploadsPath);
          const downloadedFile = files.find(f => f.startsWith(timestamp.toString()));
          
          if (!downloadedFile) {
            return res.status(500).json({ error: 'Fichier non trouvé après téléchargement' });
          }
          
          // Extraire le titre du nom de fichier
          videoTitle = downloadedFile.replace(/^\d+-/, '').replace(/\.(mp3|webm|m4a)$/, '');
          
          // Ajouter à la playlist
          const playlistsPath = path.join(__dirname, '../data/playlists');
          if (!fs.existsSync(playlistsPath)) {
            fs.mkdirSync(playlistsPath, { recursive: true });
          }
          
          // Chercher ou créer la playlist
          const playlistFiles = fs.readdirSync(playlistsPath);
          let playlistFile = playlistFiles.find(f => {
            try {
              const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
              return data.guildId === guildId && data.name === playlistName;
            } catch (e) {
              return false;
            }
          });
          
          let playlist;
          if (playlistFile) {
            // Playlist existe
            playlist = JSON.parse(fs.readFileSync(path.join(playlistsPath, playlistFile), 'utf8'));
          } else {
            // Créer nouvelle playlist
            const safeFilename = playlistName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
            playlistFile = `${guildId}_${safeFilename}_${Date.now()}.json`;
            playlist = {
              name: playlistName,
              guildId: guildId,
              tracks: [],
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
          }
          
          // Ajouter la piste
          playlist.tracks.push({
            title: videoTitle,
            source: 'upload',
            filename: downloadedFile,
            url: link,
            addedAt: Date.now()
          });
          playlist.updatedAt = Date.now();
          
          // Sauvegarder
          fs.writeFileSync(path.join(playlistsPath, playlistFile), JSON.stringify(playlist, null, 2));
          
          console.log(`[Music Dashboard] Fichier ${downloadedFile} ajouté à ${playlistName}`);
          res.json({ success: true, title: videoTitle, filename: downloadedFile });
          
        } catch (error) {
          console.error('[Music Dashboard] Erreur post-téléchargement:', error);
          res.status(500).json({ error: error.message });
        }
      } else {
        console.error(`[yt-dlp] Échec du téléchargement, code: ${code}`);
        res.status(500).json({ error: 'Échec du téléchargement' });
      }
    });
    
  } catch (error) {
    console.error('[Music Dashboard] Erreur add-link:', error);
    res.status(500).json({ error: error.message });
  }
});


// POST /api/music/playlist/create - Créer une nouvelle playlist
app.post('/api/music/playlist/create', requireAdminAuth, (req, res) => {
  try {
    const { guildId, name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Nom de playlist requis' });
    }
    
    const playlistsPath = path.join(__dirname, '../data/playlists');
    if (!fs.existsSync(playlistsPath)) {
      fs.mkdirSync(playlistsPath, { recursive: true });
    }
    
    // Vérifier qu'aucune playlist n'a ce nom
    const files = fs.readdirSync(playlistsPath);
    const nameExists = files.some(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
        return data.guildId === guildId && data.name === name.trim();
      } catch (e) {
        return false;
      }
    });
    
    if (nameExists) {
      return res.status(400).json({ error: 'Une playlist avec ce nom existe déjà' });
    }
    
    const playlist = {
      name: name.trim(),
      guildId: guildId,
      tracks: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const filename = `${guildId}-${name.trim().replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
    const filepath = path.join(playlistsPath, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(playlist, null, 2));
    console.log(`✅ Nouvelle playlist créée: ${name}`);
    res.json({ success: true, playlist });
  } catch (error) {
    console.error('Erreur création playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/music/playlist/:guildId/:name/add - Ajouter une piste à une playlist
app.post('/api/music/playlist/:guildId/:name/add', requireAdminAuth, (req, res) => {
  try {
    const { guildId, name } = req.params;
    const { filename, title, author, duration } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Nom de fichier requis' });
    }
    
    const playlistsPath = path.join(__dirname, '../data/playlists');
    const files = fs.readdirSync(playlistsPath);
    
    const playlistFile = files.find(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
        return data.guildId === guildId && data.name === name;
      } catch (e) {
        return false;
      }
    });
    
    if (playlistFile) {
      const filepath = path.join(playlistsPath, playlistFile);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      // Créer la piste avec les métadonnées
      const track = {
        title: title || filename.replace(/^\d+-/, '').replace(/\.[^.]+$/, ''),
        author: author || 'Artiste inconnu',
        filename: filename,
        duration: duration || '0:00',
        addedAt: Date.now()
      };
      
      data.tracks.push(track);
      data.updatedAt = Date.now();
      
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      console.log(`✅ Piste ajoutée à ${name}: ${track.title}`);
      res.json({ success: true, playlist: data });
    } else {
      res.status(404).json({ error: 'Playlist non trouvée' });
    }
  } catch (error) {
    console.error('Erreur ajout piste:', error);
    res.status(500).json({ error: error.message });
  }
});


// Charger le router add-link
require("./add-link-router")(app);



// ============ A/V (Action/Vérité) API Routes ============

// Get A/V prompts for a mode (sfw or nsfw)
app.get('/api/truthdare/:mode', (req, res) => {
  try {
    const { mode } = req.params;
    if (!['sfw', 'nsfw'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be sfw or nsfw' });
    }
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    const tdData = guildConfig.truthdare || { sfw: { prompts: [], channels: [] }, nsfw: { prompts: [], channels: [] } };
    res.json(tdData[mode] || { prompts: [], channels: [] });
  } catch (err) {
    console.error('Error in GET /api/truthdare/:mode:', err);
    res.status(500).json({ error: 'Failed to fetch truth/dare data' });
  }
});

// Add a new prompt
app.post('/api/truthdare/:mode', requireAdminAuth, (req, res) => {
  try {
    const { mode } = req.params;
    const { type, text } = req.body;
    if (!['sfw', 'nsfw'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be sfw or nsfw' });
    }
    if (!type || !text) {
      return res.status(400).json({ error: 'Type and text are required' });
    }
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    if (!guildConfig.truthdare) {
      guildConfig.truthdare = { sfw: { prompts: [], channels: [] }, nsfw: { prompts: [], channels: [] } };
    }
    if (!guildConfig.truthdare[mode]) {
      guildConfig.truthdare[mode] = { prompts: [], channels: [] };
    }
    if (!guildConfig.truthdare[mode].prompts) {
      guildConfig.truthdare[mode].prompts = [];
    }
    const newId = Math.max(0, ...guildConfig.truthdare[mode].prompts.map(p => p.id || 0)) + 1;
    const newPrompt = { id: newId, type, text };
    guildConfig.truthdare[mode].prompts.push(newPrompt);
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    console.log(`✅ Prompt A/V ${mode} ajouté: #${newId} (${type})`);
    res.json({ success: true, prompt: newPrompt });
  } catch (err) {
    console.error('Error in POST /api/truthdare/:mode:', err);
    res.status(500).json({ error: 'Failed to add prompt' });
  }
});

// Edit a prompt
app.patch('/api/truthdare/:mode/:id', requireAdminAuth, (req, res) => {
  try {
    const { mode, id } = req.params;
    const { text } = req.body;
    if (!['sfw', 'nsfw'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be sfw or nsfw' });
    }
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    if (!guildConfig.truthdare || !guildConfig.truthdare[mode] || !guildConfig.truthdare[mode].prompts) {
      return res.status(404).json({ error: 'No prompts found' });
    }
    const promptId = parseInt(id);
    const prompt = guildConfig.truthdare[mode].prompts.find(p => p.id === promptId);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    prompt.text = text;
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    console.log(`✅ Prompt A/V ${mode} modifié: #${promptId}`);
    res.json({ success: true, prompt });
  } catch (err) {
    console.error('Error in PATCH /api/truthdare/:mode/:id:', err);
    res.status(500).json({ error: 'Failed to edit prompt' });
  }
});

// Delete a prompt
app.delete('/api/truthdare/:mode/:id', requireAdminAuth, (req, res) => {
  try {
    const { mode, id } = req.params;
    if (!['sfw', 'nsfw'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be sfw or nsfw' });
    }
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    if (!guildConfig.truthdare || !guildConfig.truthdare[mode] || !guildConfig.truthdare[mode].prompts) {
      return res.status(404).json({ error: 'No prompts found' });
    }
    const promptId = parseInt(id);
    const index = guildConfig.truthdare[mode].prompts.findIndex(p => p.id === promptId);
    if (index === -1) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    guildConfig.truthdare[mode].prompts.splice(index, 1);
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    console.log(`✅ Prompt A/V ${mode} supprimé: #${promptId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/truthdare/:mode/:id:', err);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// Add a channel
app.post('/api/truthdare/:mode/channels', requireAdminAuth, (req, res) => {
  try {
    const { mode } = req.params;
    const { channelId } = req.body;
    if (!['sfw', 'nsfw'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be sfw or nsfw' });
    }
    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    if (!guildConfig.truthdare) {
      guildConfig.truthdare = { sfw: { prompts: [], channels: [] }, nsfw: { prompts: [], channels: [] } };
    }
    if (!guildConfig.truthdare[mode]) {
      guildConfig.truthdare[mode] = { prompts: [], channels: [] };
    }
    if (!guildConfig.truthdare[mode].channels) {
      guildConfig.truthdare[mode].channels = [];
    }
    if (!guildConfig.truthdare[mode].channels.includes(channelId)) {
      guildConfig.truthdare[mode].channels.push(channelId);
    }
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    console.log(`✅ Channel A/V ${mode} ajouté: ${channelId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/truthdare/:mode/channels:', err);
    res.status(500).json({ error: 'Failed to add channel' });
  }
});

// Delete a channel
app.delete('/api/truthdare/:mode/channels/:channelId', requireAdminAuth, (req, res) => {
  try {
    const { mode, channelId } = req.params;
    if (!['sfw', 'nsfw'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be sfw or nsfw' });
    }
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    if (!guildConfig.truthdare || !guildConfig.truthdare[mode] || !guildConfig.truthdare[mode].channels) {
      return res.status(404).json({ error: 'No channels found' });
    }
    const index = guildConfig.truthdare[mode].channels.indexOf(channelId);
    if (index === -1) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    guildConfig.truthdare[mode].channels.splice(index, 1);
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    console.log(`✅ Channel A/V ${mode} supprimé: ${channelId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/truthdare/:mode/channels/:channelId:', err);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// ============ Counting API Routes ============

// Get counting configuration
app.get('/api/counting', (req, res) => {
  try {
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    const counting = guildConfig.counting || { allowFormulas: false, state: {}, achievedNumbers: [] };
    res.json(counting);
  } catch (err) {
    console.error('Error in GET /api/counting:', err);
    res.status(500).json({ error: 'Failed to fetch counting config' });
  }
});

// Update counting configuration
app.post('/api/counting', requireAdminAuth, (req, res) => {
  try {
    const { allowFormulas, channels } = req.body;
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    if (!guildConfig.counting) {
      guildConfig.counting = { allowFormulas: false, state: {}, achievedNumbers: [], channels: [] };
    }
    
    if (allowFormulas !== undefined) {
      guildConfig.counting.allowFormulas = allowFormulas;
    }
    if (channels !== undefined) {
      guildConfig.counting.channels = channels;
    }
    
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    
    console.log(`✅ Counting config updated: allowFormulas=${allowFormulas}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/counting:', err);
    res.status(500).json({ error: 'Failed to update counting config' });
  }
});

// Add counting channel
app.post('/api/counting/channels', requireAdminAuth, (req, res) => {
  try {
    const { channelId } = req.body;
    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }
    
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    if (!guildConfig.counting) {
      guildConfig.counting = { allowFormulas: false, state: {}, achievedNumbers: [], channels: [] };
    }
    if (!guildConfig.counting.channels) {
      guildConfig.counting.channels = [];
    }
    
    if (!guildConfig.counting.channels.includes(channelId)) {
      guildConfig.counting.channels.push(channelId);
    }
    
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    
    console.log(`✅ Counting channel ajouté: ${channelId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/counting/channels:', err);
    res.status(500).json({ error: 'Failed to add channel' });
  }
});

// Delete counting channel
app.delete('/api/counting/channels/:channelId', requireAdminAuth, (req, res) => {
  try {
    const { channelId } = req.params;
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    if (!guildConfig.counting || !guildConfig.counting.channels) {
      return res.status(404).json({ error: 'No channels found' });
    }
    
    const index = guildConfig.counting.channels.indexOf(channelId);
    if (index === -1) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    guildConfig.counting.channels.splice(index, 1);
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    
    console.log(`✅ Counting channel supprimé: ${channelId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/counting/channels/:channelId:', err);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// ============ Welcome API Routes ============

// Get welcome configuration
app.get('/api/welcome', (req, res) => {
  try {
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    const welcome = guildConfig.welcome || {
      enabled: false,
      channelId: '',
      message: '',
      embedEnabled: false,
      embedTitle: '',
      embedDescription: '',
      embedColor: '',
      embedFooter: '',
      sendEmbedInDM: false
    };
    res.json(welcome);
  } catch (err) {
    console.error('Error in GET /api/welcome:', err);
    res.status(500).json({ error: 'Failed to fetch welcome config' });
  }
});

// Update welcome configuration
app.post('/api/welcome', requireAdminAuth, (req, res) => {
  try {
    const { welcome } = req.body;
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    guildConfig.welcome = welcome;
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    
    console.log(`✅ Welcome config updated`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/welcome:', err);
    res.status(500).json({ error: 'Failed to update welcome config' });
  }
});

// ============ Goodbye API Routes ============

// Get goodbye configuration
app.get('/api/goodbye', (req, res) => {
  try {
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    const goodbye = guildConfig.goodbye || {
      enabled: false,
      channelId: '',
      message: '',
      embedEnabled: false,
      embedTitle: '',
      embedDescription: '',
      embedColor: '',
      embedFooter: ''
    };
    res.json(goodbye);
  } catch (err) {
    console.error('Error in GET /api/goodbye:', err);
    res.status(500).json({ error: 'Failed to fetch goodbye config' });
  }
});

// Update goodbye configuration
app.post('/api/goodbye', requireAdminAuth, (req, res) => {
  try {
    const { goodbye } = req.body;
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    guildConfig.goodbye = goodbye;
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    
    console.log(`✅ Goodbye config updated`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/goodbye:', err);
    res.status(500).json({ error: 'Failed to update goodbye config' });
  }
});

// ============ Page Routes ============

// Route pour la page principale
// Routes déplacées en haut du fichier pour éviter le cache


app.get("/api/proxy-image", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send("URL manquante");
    
    const https = require("https");
    const http = require("http");
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === "https:" ? https : http;
    
    protocol.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/*"
      }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return res.redirect(response.headers.location);
      }
      res.set("Content-Type", response.headers["content-type"] || "image/gif");
      res.set("Cache-Control", "public, max-age=86400");
      res.set("Access-Control-Allow-Origin", "*");
      response.pipe(res);
    }).on("error", (err) => {
      console.error("Erreur proxy:", err.message);
      res.status(500).send("Erreur chargement image");
    });
  } catch (error) {
    console.error("Erreur proxy-image:", error.message);
    res.status(500).send("Erreur serveur");
  }
});


// Route pour recevoir un GIF uploadé depuis le navigateur
app.post('/api/upload-gif-from-browser', async (req, res) => {
  try {
    if (!req.files || !req.files.gif) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const gif = req.files.gif;
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex').substring(0, 8);
    const filename = 'discord_' + hash + '.gif';
    const uploadPath = path.join(__dirname, 'public/gifs', filename);
    
    // Sauvegarder le fichier
    await gif.mv(uploadPath);
    
    const localUrl = 'http://82.67.65.98:3002/gifs/' + filename;
    console.log('✅ GIF uploadé depuis navigateur:', filename);
    
    res.json({ success: true, url: localUrl });
  } catch (error) {
    console.error('❌ Erreur upload navigateur:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== Webhook actions (signed) ==========
app.post('/webhook/restart', verifyWebhook, (req, res) => restartBot(res));
app.post('/webhook/deploy-commands', verifyWebhook, (req, res) => deployCommands(res));
app.post('/webhook/backup', verifyWebhook, (req, res) => {
  // Reuse existing logic via a lightweight inline backup (same as /backup)
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup-${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, filename);
    const config = readConfig();
    fs.writeFileSync(backupPath, JSON.stringify(config, null, 2), 'utf8');
    return res.json({ success: true, filename });
  } catch (err) {
    console.error('Error creating backup (webhook):', err);
    return res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Send a Discord message (requires DISCORD_TOKEN)
app.post('/webhook/message', verifyWebhook, async (req, res) => {
  try {
    const { channelId, content } = req.body || {};
    if (!channelId || !content) return res.status(400).json({ error: 'channelId and content are required' });
    const token = await getDiscordBotToken();
    if (!token) return res.status(500).json({ error: 'DISCORD_TOKEN missing' });

    const payload = JSON.stringify({ content: String(content).slice(0, 2000) });
    const options = {
      hostname: 'discord.com',
      path: `/api/v10/channels/${channelId}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req2 = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => (data += chunk));
      resp.on('end', () => {
        if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
          return res.json({ success: true });
        }
        console.error('Discord API message error:', resp.statusCode, data);
        return res.status(502).json({ error: 'Discord API error', status: resp.statusCode, details: data });
      });
    });
    req2.on('error', (e) => {
      console.error('Discord API request error:', e);
      return res.status(502).json({ error: 'Discord API request failed' });
    });
    req2.write(payload);
    req2.end();
  } catch (err) {
    console.error('Error in webhook message:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Dashboard V2 Server running on port ${PORT}`);
  console.log(`✓ Guild ID: ${GUILD}`);
  console.log(`✓ Config file: ${CONFIG}`);
  console.log(`✓ Access: http://localhost:${PORT}`);
  console.log(`✓ Discord API integration enabled`);
  console.log(`✓ Secrets file: ${DASHBOARD_SECRETS_PATH}`);
  // Async check (don't crash the process on missing env vars).
  void (async () => {
    const clientId = await getDiscordOAuthClientId();
    const clientSecret = await getDiscordOAuthClientSecret();
    if (!clientId || !clientSecret) {
      console.log('⚠️ Discord login is not configured yet (missing OAuth client id/secret).');
      console.log('   Set DISCORD_OAUTH_CLIENT_ID/SECRET in PM2 env or dashboard-secrets.json.');
    }
  })().catch(() => {});
});
