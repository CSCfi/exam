// SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

// A stand-in LTI 1.3 tool for the cross-site GUI tests (tests/lti-cross-site.spec.ts). It runs on
// https://127.0.0.1:8443 while EXAM runs on http://localhost, so the two are different sites, as
// EXAM and a university's Moodle are in production.
//
// It does what Moodle 5.1's enrol_lti does with cookies, since that is what browsers treat
// differently (public/enrol/lti/login.php, public/auth/lti/classes/local/ltiadvantage/utility/
// cookie_helper.php):
// - Before the login it sets two test cookies, SameSite=None and SameSite=None + Partitioned, and
//   redirects to itself. If neither comes back it shows "Cookies are blocked by your browser".
// - It keeps the login's state in a cookie, set the way the check found to work, and the launch is
//   refused if that cookie does not come back.
// - It verifies EXAM's id_token against EXAM's JWKS (signature, issuer, audience, nonce).
// The launch page reports who was launched, in which role and presentation, and how the cookies
// were kept, for the test to read.
//
// Usage: node server.mjs <dir with tool-cert.pem and tool-key.pem>. Settings from the environment:
// E2E_TOOL_PORT (8443), E2E_PLATFORM (http://localhost), E2E_CLIENT_ID (e2e-client).

import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { join } from 'node:path';

const dir = process.argv[2] ?? join(import.meta.dirname, '..', '.lti');
const port = Number(process.env.E2E_TOOL_PORT ?? 8443);
const platform = process.env.E2E_PLATFORM ?? 'http://localhost';
const clientId = process.env.E2E_CLIENT_ID ?? 'e2e-client';
const origin = `https://127.0.0.1:${port}`;

const LtiClaim = 'https://purl.imsglobal.org/spec/lti/claim';

// state -> { nonce, method }; a login is completed once
const logins = new Map();

const escape = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const page = (res, status, title, body) => {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(`<!doctype html><html><head><title>${escape(title)}</title></head><body>${body}</body></html>`);
};

const cookiesOf = (req) =>
    Object.fromEntries(
        (req.headers.cookie ?? '')
            .split(';')
            .map((c) => c.trim().split('='))
            .filter(([k]) => k),
    );

const cookie = (name, value, { partitioned = false, maxAge = 300 } = {}) =>
    `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=None; Secure; HttpOnly${partitioned ? '; Partitioned' : ''}`;

const random = () => randomBytes(16).toString('hex');

function login(req, res, url) {
    const params = url.searchParams;
    if (!params.has('cookiecheck')) {
        params.set('cookiecheck', '1');
        res.writeHead(302, {
            Location: `${url.pathname}?${params}`,
            'Set-Cookie': [
                cookie('check1', '1', { maxAge: 30 }),
                cookie('check2', '1', { maxAge: 30, partitioned: true }),
            ],
        });
        return res.end();
    }
    const cookies = cookiesOf(req);
    const method = cookies.check1 ? 'unpartitioned' : cookies.check2 ? 'partitioned' : null;
    if (!method) {
        return page(
            res,
            200,
            'Cookies are blocked',
            `<h3>Cookies are blocked by your browser</h3>
             <p>This tool can't be launched because your browser seems to be blocking third-party cookies.</p>`,
        );
    }
    if (params.get('iss') !== platform || params.get('client_id') !== clientId) {
        return page(res, 400, 'Unknown platform', '<h3>Unknown platform or client</h3>');
    }
    const state = random();
    const nonce = random();
    logins.set(state, { nonce, method });
    const auth = new URLSearchParams({
        scope: 'openid',
        response_type: 'id_token',
        response_mode: 'form_post',
        prompt: 'none',
        client_id: clientId,
        redirect_uri: `${origin}/launch`,
        state,
        nonce,
        login_hint: params.get('login_hint') ?? '',
        lti_message_hint: params.get('lti_message_hint') ?? '',
    });
    res.writeHead(302, {
        Location: `${platform}/integration/lti/oidc/login?${auth}`,
        'Set-Cookie': cookie(`state_${state}`, '1', { partitioned: method === 'partitioned' }),
    });
    res.end();
}

async function verifyToken(token, nonce) {
    const [header64, payload64, signature64] = token.split('.');
    const header = JSON.parse(Buffer.from(header64, 'base64url'));
    const claims = JSON.parse(Buffer.from(payload64, 'base64url'));
    if (header.alg !== 'RS256') throw new Error(`alg ${header.alg}`);
    const jwks = await fetch(`${platform}/integration/lti/oidc/jwks`).then((r) => r.json());
    const jwk = jwks.keys.find((k) => k.kid === header.kid);
    if (!jwk) throw new Error(`no key ${header.kid}`);
    const ok = verify(
        'RSA-SHA256',
        Buffer.from(`${header64}.${payload64}`),
        createPublicKey({ key: jwk, format: 'jwk' }),
        Buffer.from(signature64, 'base64url'),
    );
    if (!ok) throw new Error('bad signature');
    const audience = [claims.aud].flat();
    if (claims.iss !== platform) throw new Error(`iss ${claims.iss}`);
    if (!audience.includes(clientId)) throw new Error(`aud ${claims.aud}`);
    if (claims.nonce !== nonce) throw new Error('nonce');
    if (claims.exp * 1000 < Date.now()) throw new Error('expired');
    return claims;
}

async function launch(req, res) {
    let body = '';
    for await (const chunk of req) body += chunk;
    const form = new URLSearchParams(body);
    const state = form.get('state') ?? '';
    const login = logins.get(state);
    logins.delete(state);
    if (!login) return page(res, 400, 'Unknown state', '<h3>Unknown or used state</h3>');
    // Moodle's launch checks the state against its cookie; without it the launch fails
    if (!cookiesOf(req)[`state_${state}`]) {
        return page(res, 400, 'State cookie missing', '<h3>The state cookie did not come back</h3>');
    }
    let claims;
    try {
        claims = await verifyToken(form.get('id_token') ?? '', login.nonce);
    } catch (e) {
        return page(res, 400, 'Invalid token', `<h3>Invalid id_token</h3><p>${escape(e.message)}</p>`);
    }
    const roles = (claims[`${LtiClaim}/roles`] ?? []).map((r) => r.split('#').pop());
    const target = claims[`${LtiClaim}/launch_presentation`]?.document_target;
    page(
        res,
        200,
        'E2E tool',
        `<h3>E2E tool</h3>
         <p id="user">Launched as ${escape(claims.name)}</p>
         <p id="roles">Roles: ${escape(roles.join(', '))}</p>
         <p id="target">Shown in: ${escape(target)}</p>
         <p id="resource">Resource: ${escape(claims[`${LtiClaim}/custom`]?.id)}</p>
         <p id="cookies">Cookies: ${escape(login.method)}</p>`,
    );
}

const tls = { cert: readFileSync(join(dir, 'tool-cert.pem')), key: readFileSync(join(dir, 'tool-key.pem')) };

createServer(tls, (req, res) => {
    const url = new URL(req.url ?? '/', origin);
    if (req.method === 'GET' && url.pathname === '/login') return login(req, res, url);
    if (req.method === 'POST' && url.pathname === '/launch') {
        return launch(req, res).catch((e) => page(res, 500, 'Error', escape(e.message)));
    }
    if (url.pathname === '/health') return page(res, 200, 'ok', 'ok');
    page(res, 404, 'Not found', 'Not found');
}).listen(port, '127.0.0.1', () => console.log(`E2E LTI tool on ${origin}, platform ${platform}`));
