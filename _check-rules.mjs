// Check current Firestore rules vs local file
// Uses the same OAuth flow as before

import http from 'http';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { URL } from 'url';

const CLIENT_ID = '32555940559.apps.googleusercontent.com';
const CLIENT_SECRET = 'ZmssLN***';
const SCOPES = 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase';
const PROJECT = 'opensystem-857b2';
const PORT = 9091;

const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

const REDIRECT_URI = `http://localhost:${PORT}/callback`;

let authCode = null;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/callback') {
    authCode = url.searchParams.get('code');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1 style="font-family:sans-serif;color:green">✓ Auth OK</h1>');
    server.close();
  }
});

server.listen(PORT, async () => {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log('[oauth] Opening auth URL in Chrome...');
  try {
    execSync(`open -a "Google Chrome" "${authUrl.toString()}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error('[oauth] Failed to open Chrome:', e.message);
  }

  setTimeout(() => {
    if (!authCode) {
      console.error('[oauth] Timeout');
      process.exit(1);
    }
  }, 5 * 60 * 1000);
});

async function exchangeAndCheck() {
  if (!authCode) return;

  console.log('[oauth] Exchanging code for tokens...');
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: authCode,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    }),
  });

  const tokens = await tokenResp.json();
  if (tokens.error) {
    console.error('[oauth] Token exchange failed:', tokens);
    return;
  }

  // Get current Firestore rules
  console.log('[firestore] Fetching current rules...');
  const rulesResp = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const rulesData = await rulesResp.json();
  console.log('[firestore] Rulesets:', JSON.stringify(rulesData, null, 2));
}

const interval = setInterval(async () => {
  if (authCode) {
    clearInterval(interval);
    await exchangeAndCheck();
    process.exit(0);
  }
}, 1000);