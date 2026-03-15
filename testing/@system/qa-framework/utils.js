'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Make an HTTP/HTTPS GET request with redirect following and timeout.
 * @param {string} urlStr
 * @param {object} options - { headers, timeout, maxRedirects, maxBodySize }
 * @returns {Promise<{statusCode, headers, body, bodySize, duration, redirects, finalUrl}>}
 */
async function httpGet(urlStr, options = {}) {
  const timeout = options.timeout || 10000;
  const maxRedirects = options.maxRedirects !== undefined ? options.maxRedirects : 5;
  const maxBodySize = options.maxBodySize || 10 * 1024 * 1024; // 10MB
  const start = Date.now();
  let redirectCount = 0;
  let currentUrl = urlStr;

  const doRequest = (url) =>
    new Promise((resolve, reject) => {
      let parsed;
      try {
        parsed = new URL(url);
      } catch (e) {
        return reject(new Error(`Invalid URL: ${url}`));
      }

      const lib = parsed.protocol === 'https:' ? https : http;
      const reqOptions = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'AssimetriaQA/1.0',
          Accept: 'text/html,application/json,*/*',
          ...options.headers,
        },
      };

      const req = lib.request(reqOptions, (res) => {
        let body = '';
        let bodySize = 0;

        res.on('data', (chunk) => {
          bodySize += chunk.length;
          if (bodySize <= maxBodySize) body += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
            bodySize,
            truncated: bodySize > maxBodySize,
          });
        });
      });

      req.setTimeout(timeout, () => {
        req.destroy(new Error(`Request timed out after ${timeout}ms`));
      });

      req.on('error', reject);
      req.end();
    });

  while (true) {
    const res = await doRequest(currentUrl);

    if (
      [301, 302, 303, 307, 308].includes(res.statusCode) &&
      res.headers.location &&
      redirectCount < maxRedirects
    ) {
      try {
        currentUrl = new URL(res.headers.location, currentUrl).href;
      } catch (e) {
        return { ...res, duration: Date.now() - start, redirects: redirectCount, finalUrl: currentUrl };
      }
      redirectCount++;
      continue;
    }

    return { ...res, duration: Date.now() - start, redirects: redirectCount, finalUrl: currentUrl };
  }
}

/**
 * Wrap a promise with a timeout. Clears the timer on resolution.
 */
function withTimeout(promise, ms, label = 'Operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Create a standardized check result object.
 * @param {string} name - Check name
 * @param {'pass'|'fail'|'warn'|'skip'|'error'} status
 * @param {string} details - Human-readable details
 * @param {number} duration - Duration in ms
 * @param {object} extra - Additional fields (value, threshold, etc.)
 */
function result(name, status, details = '', duration = 0, extra = {}) {
  return { name, status, details, duration, ...extra };
}

/**
 * Run an async check function with error and timeout protection.
 * Never throws — returns an 'error' result on failure.
 */
async function tryCheck(name, fn, timeoutMs = 15000) {
  const start = Date.now();
  try {
    const res = await withTimeout(fn(), timeoutMs, name);
    return res;
  } catch (err) {
    return result(name, 'error', err.message, Date.now() - start);
  }
}

/**
 * Extract all regex matches from a string (global search).
 * Returns array of match arrays.
 */
function extractAll(str, regex) {
  const matches = [];
  const g = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  let m;
  while ((m = g.exec(str)) !== null) {
    matches.push(m);
  }
  return matches;
}

/**
 * Test whether a string contains emoji characters.
 */
function hasEmoji(str) {
  // Extended emoji unicode ranges
  const emojiRanges = [
    /[\u{1F300}-\u{1F9FF}]/u,
    /[\u{2600}-\u{27BF}]/u,
    /[\u{1F000}-\u{1FFFF}]/u,
    /[\u{FE00}-\u{FE0F}]/u,
    /[\u{1FA00}-\u{1FAFF}]/u,
  ];
  return emojiRanges.some((r) => r.test(str));
}

/**
 * Strip HTML tags and decode common entities to get visible text.
 */
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safely resolve href relative to a base URL.
 * Returns null on invalid input.
 */
function resolveUrl(href, baseUrl) {
  if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
    return null;
  }
  try {
    return new URL(href, baseUrl).href;
  } catch (e) {
    return null;
  }
}

/**
 * Check if a URL shares the same hostname as the base URL.
 */
function isInternalUrl(href, baseUrl) {
  try {
    const base = new URL(baseUrl);
    const target = new URL(href, baseUrl);
    return target.hostname === base.hostname;
  } catch (e) {
    return false;
  }
}

/**
 * Deduplicate an array of strings.
 */
function unique(arr) {
  return [...new Set(arr)];
}

/**
 * Format bytes as human-readable string.
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * Clamp a number between min and max.
 */
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Linear interpolation score: 100 when value <= good, 0 when value >= bad.
 */
function linearScore(value, good, bad) {
  if (value <= good) return 100;
  if (value >= bad) return 0;
  return Math.round(((bad - value) / (bad - good)) * 100);
}

module.exports = {
  httpGet,
  withTimeout,
  result,
  tryCheck,
  extractAll,
  hasEmoji,
  stripHtml,
  resolveUrl,
  isInternalUrl,
  unique,
  formatBytes,
  clamp,
  linearScore,
};
