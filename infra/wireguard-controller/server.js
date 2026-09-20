'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.NOVA_CONTROLLER_TOKEN || '';
const SERVER_ID = process.env.NOVA_SERVER_ID || '';
const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
const WG_NETWORK = process.env.WG_NETWORK || '10.66.0.0/24';
const WG_SERVER_ADDRESS = process.env.WG_SERVER_ADDRESS || '10.66.0.1/24';
const WG_SERVER_PUBLIC_KEY = process.env.WG_SERVER_PUBLIC_KEY || '';
const WG_ENDPOINT_HOST = process.env.WG_ENDPOINT_HOST || '';
const WG_ENDPOINT_PORT = Number(process.env.WG_ENDPOINT_PORT || 51820);
const WG_DNS = (process.env.WG_DNS || '1.1.1.1,1.0.0.1').split(',').map(s => s.trim()).filter(Boolean);
const STATE_FILE = process.env.NOVA_STATE_FILE || '/var/lib/nova-wg/peers.json';
const KEEPALIVE = Number(process.env.WG_PERSISTENT_KEEPALIVE || 25);
const CLEANUP_INTERVAL_MS = Number(process.env.NOVA_CLEANUP_INTERVAL_MS || 60000);
const MTU = Number(process.env.WG_MTU || 1280);

let queue = Promise.resolve();
function serial(fn) {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
}

function json(res, status, body) {
  const out = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(out),
  });
  res.end(out);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 64 * 1024) req.destroy(new Error('body too large'));
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 15000, maxBuffer: 1024 * 1024, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function ensureStateDir() {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true, mode: 0o700 });
}
function loadState() {
  ensureStateDir();
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { version: 1, peers: {} }; }
}
function saveState(state) {
  ensureStateDir();
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, STATE_FILE);
}

function ipToInt(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(x => !Number.isInteger(x) || x < 0 || x > 255)) throw new Error('invalid IPv4');
  return (((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]) >>> 0;
}
function intToIp(n) {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}
function allocateAddress(state) {
  const base = ipToInt('10.66.0.1');
  const used = new Set(Object.values(state.peers).map(p => p.address));
  for (let i = 2; i <= 254; i++) {
    const ip = intToIp(base + i - 1);
    if (!used.has(ip)) return ip;
  }
  throw new Error('VPN address pool exhausted');
}
function validPublicKey(key) {
  return typeof key === 'string' && /^[A-Za-z0-9+/]{42}==$/.test(key);
}
function validUserId(id) {
  return typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id);
}
function auth(req) {
  if (!TOKEN) return false;
  const header = req.headers.authorization || '';
  return header === `Bearer ${TOKEN}`;
}

async function configurePeer(publicKey, address) {
  await run('wg', ['set', WG_INTERFACE, 'peer', publicKey, 'allowed-ips', `${address}/32`, 'persistent-keepalive', String(KEEPALIVE)]);
}
async function removePeer(publicKey) {
  await run('wg', ['set', WG_INTERFACE, 'peer', publicKey, 'remove']);
}

async function provision(body) {
  const { user_id: userId, server_id: serverId, public_key: publicKey, expires_at: expiresAt } = body;
  if (!validUserId(userId)) throw new Error('invalid user_id');
  if (!SERVER_ID) throw new Error('controller server_id is not configured');
  if (serverId !== SERVER_ID) throw new Error('server_id mismatch');
  if (!validPublicKey(publicKey)) throw new Error('invalid WireGuard public_key');
  if (expiresAt !== null && expiresAt !== undefined && Number.isNaN(new Date(expiresAt).getTime())) throw new Error('invalid expires_at');
  if (!WG_SERVER_PUBLIC_KEY || !WG_ENDPOINT_HOST) throw new Error('controller server identity is not configured');

  const state = loadState();
  const key = userId;
  const old = state.peers[key];
  let address = old?.address;

  if (old && old.public_key !== publicKey) {
    try { await removePeer(old.public_key); } catch (e) { /* already absent is safe */ }
  }
  if (!address) address = allocateAddress(state);

  await configurePeer(publicKey, address);
  state.peers[key] = {
    user_id: userId,
    server_id: serverId || SERVER_ID || null,
    public_key: publicKey,
    address,
    expires_at: expiresAt || null,
    updated_at: new Date().toISOString(),
  };
  saveState(state);

  return {
    address: `${address}/32`,
    dns: WG_DNS,
    server_public_key: WG_SERVER_PUBLIC_KEY,
    endpoint: `${WG_ENDPOINT_HOST}:${WG_ENDPOINT_PORT}`,
    allowed_ips: ['0.0.0.0/0'],
    persistent_keepalive: KEEPALIVE,
    mtu: MTU,
  };
}

async function revoke(userId) {
  if (!validUserId(userId)) throw new Error('invalid user_id');
  const state = loadState();
  const peer = state.peers[userId];
  if (!peer) return { revoked: false };
  try { await removePeer(peer.public_key); } catch (e) { /* idempotent */ }
  delete state.peers[userId];
  saveState(state);
  return { revoked: true };
}

async function restorePeers() {
  const state = loadState();
  for (const peer of Object.values(state.peers)) {
    try { await configurePeer(peer.public_key, peer.address); }
    catch (e) { console.error('Failed to restore peer', peer.user_id, e.message); }
  }
}
async function cleanupExpiredPeers() {
  await serial(async () => {
    const state = loadState();
    const now = Date.now();
    let changed = false;
    for (const [userId, peer] of Object.entries(state.peers)) {
      if (!peer.expires_at) continue;
      const expires = new Date(peer.expires_at).getTime();
      if (!Number.isFinite(expires) || expires > now) continue;
      try { await removePeer(peer.public_key); } catch (e) { console.error('Failed to remove expired peer', userId, e.message); }
      delete state.peers[userId];
      changed = true;
    }
    if (changed) saveState(state);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/healthz') {
      try {
        await run('wg', ['show', WG_INTERFACE]);
        return json(res, 200, { ok: true, wireguard: 'up', service: 'nova-wireguard-controller' });
      } catch (e) {
        return json(res, 503, { ok: false, wireguard: 'down', service: 'nova-wireguard-controller' });
      }
    }
    if (!auth(req)) return json(res, 401, { ok: false, error: 'unauthorized' });

    if (req.method === 'POST' && req.url === '/peers') {
      const body = await readBody(req);
      const config = await serial(() => provision(body));
      return json(res, 200, { ok: true, config });
    }
    if (req.method === 'DELETE' && req.url.startsWith('/peers/')) {
      const userId = decodeURIComponent(req.url.slice('/peers/'.length));
      const result = await serial(() => revoke(userId));
      return json(res, 200, { ok: true, ...result });
    }
    if (req.method === 'GET' && req.url === '/status') {
      const state = loadState();
      return json(res, 200, { ok: true, server_id: SERVER_ID || null, peer_count: Object.keys(state.peers).length });
    }
    return json(res, 404, { ok: false, error: 'not_found' });
  } catch (error) {
    console.error(error);
    return json(res, 500, { ok: false, error: error.message || 'internal_error' });
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`NOVA WireGuard controller listening on 127.0.0.1:${PORT}`);
  try { await restorePeers(); console.log('Existing WireGuard peers restored.'); }
  catch (e) { console.error('Peer restore failed:', e.message); }
  setInterval(() => cleanupExpiredPeers().catch(e => console.error('Peer cleanup failed:', e.message)), CLEANUP_INTERVAL_MS).unref();
});
