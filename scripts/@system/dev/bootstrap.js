/**
 * bootstrap.js — @system/dev
 *
 * One-shot development bootstrap:
 *   1. Copies server/.env.example → server/.env  (if absent)
 *   2. Copies client/.env.example → client/.env  (if absent)
 *   3. Generates RSA keypair (JWT_PRIVATE_KEY / JWT_PUBLIC_KEY) and symmetric
 *      encryption keys (ENCRYPT_KEY / ENCRYPT_IV) into server/.env.
 *
 * Safe to run repeatedly — steps 1-2 are skipped when .env already exists,
 * and step 3 only writes keys that are currently empty.
 *
 * Usage (from project root):
 *   npm run bootstrap
 *
 * Options:
 *   --force   Overwrite existing .env files before regenerating keys.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const forge = require('node-forge');

const ROOT = path.resolve(__dirname, '../../..');
const FORCE = process.argv.includes('--force');

// ── Step 1 & 2: Copy .env.example → .env ─────────────────────────────────────

function copyEnv(examplePath, targetPath, label) {
  const abs = (p) => path.join(ROOT, p);
  if (!fs.existsSync(abs(examplePath))) {
    console.warn(`[bootstrap] WARNING: ${examplePath} not found — skipping ${label}`);
    return;
  }
  if (fs.existsSync(abs(targetPath)) && !FORCE) {
    console.log(`[bootstrap] ${targetPath} already exists — skipping`);
    return;
  }
  fs.copyFileSync(abs(examplePath), abs(targetPath));
  console.log(`[bootstrap] Created ${targetPath}`);
}

console.log('\n── Env files ───────────────────────────────────────');
copyEnv('server/.env.example', 'server/.env', 'server');
copyEnv('client/.env.example', 'client/.env', 'client');

// ── Step 3: Generate keys into server/.env ────────────────────────────────────

const envFilePath = path.join(ROOT, 'server/.env');

if (!fs.existsSync(envFilePath)) {
  console.error('\n[bootstrap] server/.env does not exist — cannot generate keys.');
  console.error('           Ensure server/.env.example is present and re-run.');
  process.exit(1);
}

console.log('\n── Cryptographic keys ──────────────────────────────');

let envFile = fs.readFileSync(envFilePath, 'utf8');

// Exclude placeholder values like "<base64>" that ship in .env.example
const privateKeyExists  = /JWT_PRIVATE_KEY=(?!.*<base64>).+BEGIN.*PRIVATE KEY/.test(envFile);
const publicKeyExists   = /JWT_PUBLIC_KEY=(?!.*<base64>).+BEGIN PUBLIC KEY/.test(envFile);
const encryptKeyExists  = /ENCRYPT_KEY=(?!.*<[^>]+>)[^=\s]+/.test(envFile);
const encryptIvExists   = /ENCRYPT_IV=(?!.*<[^>]+>)[^=\s]+/.test(envFile);

let newEnvFile     = envFile;
let keysGenerated  = false;

// ── RSA keypair ───────────────────────────────────────────────────────────────
if (!privateKeyExists || !publicKeyExists) {
  console.log('[bootstrap] Generating RSA 2048-bit keypair...');
  const keypair = forge.pki.rsa.generateKeyPair(2048);

  // Store as single-line PEM (literal \n).  parsePemKey() on the server reverses this.
  const publicKeyPem  = forge.pki.publicKeyToPem(keypair.publicKey).replace(/\n/g, '\\n');
  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey).replace(/\n/g, '\\n');

  const publicLineExists  = /JWT_PUBLIC_KEY=/m.test(newEnvFile);
  const privateLineExists = /JWT_PRIVATE_KEY=/m.test(newEnvFile);

  if (!publicKeyExists) {
    if (publicLineExists) {
      newEnvFile = newEnvFile.replace(/JWT_PUBLIC_KEY=.*$/m, `JWT_PUBLIC_KEY=${publicKeyPem}`);
    } else {
      newEnvFile += `\nJWT_PUBLIC_KEY=${publicKeyPem}`;
    }
  }

  if (!privateKeyExists) {
    if (privateLineExists) {
      newEnvFile = newEnvFile.replace(/JWT_PRIVATE_KEY=.*$/m, `JWT_PRIVATE_KEY=${privateKeyPem}`);
    } else {
      newEnvFile += `\nJWT_PRIVATE_KEY=${privateKeyPem}`;
    }
  }

  console.log('[bootstrap] ✓ RSA keys generated');
  keysGenerated = true;
} else {
  console.log('[bootstrap] RSA keys already present — skipping');
}

// ── Symmetric encryption keys ─────────────────────────────────────────────────
if (!encryptKeyExists || !encryptIvExists) {
  console.log('[bootstrap] Generating AES-256 encryption keys...');
  const keyBytes = forge.random.getBytesSync(32);
  const ivBytes  = forge.random.getBytesSync(16);
  const keyB64   = Buffer.from(keyBytes, 'binary').toString('base64');
  const ivB64    = Buffer.from(ivBytes,  'binary').toString('base64');

  const encryptKeyLineExists = /ENCRYPT_KEY=/m.test(newEnvFile);
  const encryptIvLineExists  = /ENCRYPT_IV=/m.test(newEnvFile);

  if (!encryptKeyExists) {
    if (encryptKeyLineExists) {
      newEnvFile = newEnvFile.replace(/ENCRYPT_KEY=.*$/m, `ENCRYPT_KEY=${keyB64}`);
    } else {
      newEnvFile += `\nENCRYPT_KEY=${keyB64}`;
    }
  }

  if (!encryptIvExists) {
    if (encryptIvLineExists) {
      newEnvFile = newEnvFile.replace(/ENCRYPT_IV=.*$/m, `ENCRYPT_IV=${ivB64}`);
    } else {
      newEnvFile += `\nENCRYPT_IV=${ivB64}`;
    }
  }

  console.log('[bootstrap] ✓ Encryption keys generated');
  keysGenerated = true;
} else {
  console.log('[bootstrap] Encryption keys already present — skipping');
}

// ── Write ─────────────────────────────────────────────────────────────────────
if (keysGenerated) {
  fs.writeFileSync(envFilePath, newEnvFile);
  console.log('\n✓  Keys written to server/.env');
} else {
  console.log('\n✓  All keys already present. No changes made.');
}

console.log('\n── Done ────────────────────────────────────────────');
console.log('Fill in the remaining vars in server/.env and client/.env,');
console.log('then start the dev server: npm run dev\n');
