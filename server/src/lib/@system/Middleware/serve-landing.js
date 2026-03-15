// @system — Landing page middleware
// Serves a static landing page for unauthenticated root visitors.
//
// Usage:
//   const serveLanding = require('./lib/@system/Middleware/serve-landing');
//   serveLanding(app);          // auto-detects landing file
//   serveLanding(app, '/custom/path/to/landing.html');
//
// Detection order:
//   1. public/landing/index.html   (standard location for Docker builds)
//   2. landing/index.html          (development / monorepo layout)
//   3. landing.html                (single-file fallback)
//
// Behaviour:
//   - GET / with no auth cookie → sends landing page
//   - GET / with token cookie   → falls through to SPA / API
//   - All other routes           → untouched

'use strict';

const path = require('path');
const fs   = require('fs');

const SEARCH_PATHS = [
  'public/landing/index.html',
  'landing/index.html',
  'landing.html',
];

/**
 * Mount landing page middleware on the given Express app.
 *
 * @param {import('express').Application} app
 * @param {string} [landingPath] - Explicit path to the landing HTML file.
 *   If omitted the middleware searches SEARCH_PATHS relative to process.cwd().
 */
function serveLanding(app, landingPath) {
  if (!landingPath) {
    for (const candidate of SEARCH_PATHS) {
      const abs = path.resolve(process.cwd(), candidate);
      if (fs.existsSync(abs)) {
        landingPath = abs;
        break;
      }
    }
  } else {
    landingPath = path.resolve(landingPath);
  }

  if (!landingPath || !fs.existsSync(landingPath)) {
    // No landing page found — skip silently.  The SPA or API catch-all will
    // handle '/' instead.
    return;
  }

  // Serve static assets from the landing directory (CSS, images, fonts, etc.)
  const landingDir = path.dirname(landingPath);
  const express = require('express');
  app.use('/landing', express.static(landingDir, { index: false }));

  // Root route: unauthenticated visitors see the landing page.
  app.get('/', (req, res, next) => {
    // If the visitor has a session cookie, let them through to the SPA.
    if (req.cookies && req.cookies.token) return next();

    res.sendFile(landingPath);
  });
}

module.exports = serveLanding;
