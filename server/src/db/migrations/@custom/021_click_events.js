'use strict'

/**
 * Migration 021 – Click events table for browser fingerprint analytics
 * Tracks each click with a privacy-friendly fingerprint hash (no cookies).
 */

const fs = require('fs')
const path = require('path')

const SCHEMAS_DIR = path.join(__dirname, '../../schemas/@custom')

exports.up = async (db) => {
  const sql = fs.readFileSync(path.join(SCHEMAS_DIR, 'click_events.sql'), 'utf8')
  await db.none(sql)
  console.log('[021_click_events] applied schema: click_events')
}

exports.down = async (db) => {
  await db.none('DROP TABLE IF EXISTS click_events CASCADE')
  console.log('[021_click_events] rolled back: click_events')
}
