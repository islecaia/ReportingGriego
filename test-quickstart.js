#!/usr/bin/env node
/**
 * Prueba manual de humo contra un despliegue real de ReportingGriego (Railway).
 * Cubre los escenarios 1, 2, 3, 4, 7 y 8 de specs/002-informe-web-railway/quickstart.md.
 *
 * Uso:
 *   ADMIN_USERNAME=admin node test-quickstart.js "la-contraseña-real"
 *
 * Sin dependencias externas — solo node:https. No modifica session.js ni ningún otro
 * archivo de la app; solo hace peticiones HTTP contra BASE_URL.
 *
 * NOTA IMPORTANTE sobre el Escenario 3 ("cero explícito"): este script NO configura
 * credenciales reales de las 5 fuentes (no se piden API keys por CLI). Con un sitio sin
 * credenciales, las 5 fuentes fallan por diseño (FR-008) y sus métricas quedan `null`
 * -no `0`- porque `0` explícito solo aplica cuando una fuente SÍ responde y no reporta
 * actividad (FR-004), no cuando la fuente ni siquiera está configurada. Este script
 * verifica por tanto el comportamiento real: el registro se inserta igualmente
 * (Principio III, no bloquea) y las 5 fuentes aparecen en `sources_failed`. Si quieres
 * probar el `0` explícito de verdad, configura al menos la credencial de PageSpeed
 * (API Key pública, la más simple) antes de ejecutar este script.
 */

const https = require('node:https');
const { URL } = require('node:url');

const BASE_URL = 'https://reportinggriego.up.railway.app';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.argv[2];

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('Uso: ADMIN_USERNAME=admin node test-quickstart.js "<contraseña>"');
  process.exit(1);
}

let cookie = null;
let passCount = 0;
let failCount = 0;

function request(method, path, { body, useCookie = true } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const payload = body ? JSON.stringify(body) : null;
    const headers = {};
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (useCookie && cookie) headers['Cookie'] = cookie;

    const req = https.request(url, { method, headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = raw ? JSON.parse(raw) : null; } catch (err) { /* respuesta no-JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, json, raw });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function captureCookie(res) {
  const setCookie = res.headers['set-cookie'];
  if (setCookie && setCookie.length > 0) {
    cookie = setCookie[0].split(';')[0]; // "connect.sid=..." — descarta atributos (Path, HttpOnly, etc.)
  }
}

function check(label, condition, detail) {
  if (condition) {
    passCount += 1;
    console.log(`PASS: ${label}`);
  } else {
    failCount += 1;
    console.log(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function uniqueUrl(suffix) {
  return `https://test-quickstart-${Date.now()}-${suffix}.example.com`;
}

async function main() {
  console.log(`\n=== ReportingGriego — smoke test contra ${BASE_URL} ===\n`);

  // --- Escenario 1: acceso bloqueado sin sesión (FR-001) ---
  const beforeLogin = await request('GET', '/api/sites', { useCookie: false });
  check(
    'Escenario 1 — GET /api/sites sin sesión devuelve 401',
    beforeLogin.status === 401 && beforeLogin.json?.ok === false,
    `status=${beforeLogin.status} body=${beforeLogin.raw}`
  );

  // --- Escenario 2: login (credenciales incorrectas → 401 genérico) ---
  const badLogin = await request('POST', '/api/login', { body: { username: ADMIN_USERNAME, password: 'contraseña-incorrecta-a-propósito' } });
  check(
    'Escenario 2 — login con contraseña incorrecta devuelve 401 con mensaje genérico',
    badLogin.status === 401 && badLogin.json?.ok === false,
    `status=${badLogin.status} body=${badLogin.raw}`
  );

  // --- Escenario 2: login real ---
  const login = await request('POST', '/api/login', { body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
  captureCookie(login);
  check(
    'Escenario 2 — login con credenciales correctas devuelve ok:true',
    login.status === 200 && login.json?.ok === true,
    `status=${login.status} body=${login.raw}`
  );
  check(
    'Escenario 2 — el login devuelve una cookie de sesión (Set-Cookie)',
    Boolean(cookie),
    'no se recibió cabecera Set-Cookie en la respuesta de login'
  );

  if (!cookie) {
    console.log('\nSin cookie de sesión no se puede continuar con el resto de escenarios. Abortando.');
    printSummaryAndExit();
    return;
  }

  // --- Escenario 3: registro mensual (sin credenciales de fuente reales — ver nota de cabecera) ---
  const siteAUrl = uniqueUrl('a');
  const createA = await request('POST', '/api/sites', { body: { name: 'Test Quickstart A', url: siteAUrl } });
  check('Escenario 3 — crear sitio A', createA.status === 200 && createA.json?.ok === true, `status=${createA.status} body=${createA.raw}`);
  const siteAId = createA.json?.id;

  const genA1 = await request('POST', '/api/report/generate', { body: { site_id: siteAId } });
  check(
    'Escenario 3 — generar informe para sitio A devuelve ok:true con un registro',
    genA1.status === 200 && genA1.json?.ok === true && Boolean(genA1.json?.record?.id),
    `status=${genA1.status} body=${genA1.raw}`
  );
  check(
    'Escenario 3 — un fallo de fuente no bloquea el registro (Principio III / FR-008)',
    Array.isArray(genA1.json?.record?.sources_failed) && genA1.json.record.sources_failed.length === 5,
    `sources_failed=${JSON.stringify(genA1.json?.record?.sources_failed)} — se esperan las 5 fuentes marcadas como fallidas al no haber credenciales configuradas`
  );

  const recordsA1 = await request('GET', `/api/records?site_id=${siteAId}`);
  const numericFields = ['impressions', 'clicks', 'sessions', 'traffic_direct', 'traffic_organic', 'traffic_social', 'traffic_referral', 'perf_desktop', 'perf_mobile', 'vulnerabilities', 'malware'];
  const firstRecord = recordsA1.json?.records?.[0];
  const allNullAsExpected = firstRecord && numericFields.every((f) => firstRecord[f] === null);
  check(
    'Escenario 3 (nota) — sin fuentes configuradas, las métricas quedan null (no 0) — comportamiento esperado, ver cabecera del script',
    Boolean(allNullAsExpected),
    `record=${JSON.stringify(firstRecord)}`
  );

  // --- Escenario 4: regenerar no sobrescribe (FR-009) ---
  const genA2 = await request('POST', '/api/report/generate', { body: { site_id: siteAId } });
  check('Escenario 4 — segunda generación para sitio A devuelve ok:true', genA2.status === 200 && genA2.json?.ok === true, `status=${genA2.status} body=${genA2.raw}`);

  const recordsA2 = await request('GET', `/api/records?site_id=${siteAId}`);
  const countA = recordsA2.json?.records?.length ?? 0;
  check(
    'Escenario 4 — hay 2 registros para sitio A (ninguno sobrescrito)',
    countA === 2,
    `se encontraron ${countA} registros, se esperaban 2`
  );
  check(
    'Escenario 4 — el primer registro sigue intacto (mismo id que el de la primera generación)',
    recordsA2.json?.records?.some((r) => r.id === genA1.json?.record?.id),
    `ids actuales=${JSON.stringify(recordsA2.json?.records?.map((r) => r.id))}, se esperaba encontrar id=${genA1.json?.record?.id}`
  );

  // --- Escenario 7: oportunidades SEO (estructura de respuesta; sin keywords reales sin fuente Squirrly) ---
  const opps = await request('GET', `/api/keywords/opportunities?site_id=${siteAId}`);
  check(
    'Escenario 7 — GET /api/keywords/opportunities responde ok:true con counts.top10/top100',
    opps.status === 200 && opps.json?.ok === true && typeof opps.json?.counts?.top10 === 'number' && typeof opps.json?.counts?.top100 === 'number',
    `status=${opps.status} body=${opps.raw}`
  );

  // --- Escenario 8: aislamiento entre sitios (FR-006) ---
  const siteBUrl = uniqueUrl('b');
  const createB = await request('POST', '/api/sites', { body: { name: 'Test Quickstart B', url: siteBUrl } });
  check('Escenario 8 — crear sitio B', createB.status === 200 && createB.json?.ok === true, `status=${createB.status} body=${createB.raw}`);
  const siteBId = createB.json?.id;

  const genB1 = await request('POST', '/api/report/generate', { body: { site_id: siteBId } });
  check('Escenario 8 — generar informe para sitio B devuelve ok:true', genB1.status === 200 && genB1.json?.ok === true, `status=${genB1.status} body=${genB1.raw}`);

  const recordsBFinal = await request('GET', `/api/records?site_id=${siteBId}`);
  const recordsAFinal = await request('GET', `/api/records?site_id=${siteAId}`);
  const idsA = new Set((recordsAFinal.json?.records || []).map((r) => r.id));
  const idsB = new Set((recordsBFinal.json?.records || []).map((r) => r.id));
  const noOverlap = [...idsA].every((id) => !idsB.has(id)) && [...idsB].every((id) => !idsA.has(id));
  check(
    'Escenario 8 — sitio A tiene 2 registros y sitio B tiene 1, sin solaparse (aislamiento por sitio)',
    idsA.size === 2 && idsB.size === 1 && noOverlap,
    `A=${[...idsA]} B=${[...idsB]}`
  );

  // --- Limpieza: dar de baja los sitios de prueba (nunca se borran, Principio I / FR-011) ---
  console.log('\nLimpiando sitios de prueba (dar de baja, no se eliminan — Principio I)...');
  if (siteAId) await request('POST', `/api/sites/${siteAId}/deactivate`);
  if (siteBId) await request('POST', `/api/sites/${siteBId}/deactivate`);

  // --- Escenario 2 (logout) ---
  const logout = await request('POST', '/api/logout');
  check('Escenario 2 — logout devuelve ok:true', logout.status === 200 && logout.json?.ok === true, `status=${logout.status} body=${logout.raw}`);

  const afterLogout = await request('GET', '/api/sites');
  check(
    'Escenario 2 — GET /api/sites tras logout vuelve a devolver 401',
    afterLogout.status === 401 && afterLogout.json?.ok === false,
    `status=${afterLogout.status} body=${afterLogout.raw}`
  );

  printSummaryAndExit();
}

function printSummaryAndExit() {
  console.log(`\n=== Resumen: ${passCount} PASS, ${failCount} FAIL ===\n`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Error inesperado ejecutando el script:', err);
  process.exit(1);
});
