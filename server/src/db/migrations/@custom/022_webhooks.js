'use strict'

const fs = require('fs')
const path = require('path')

const SCHEMAS_DIR = path.join(__dirname, '../../schemas/@custom')

exports.up = async (db) => {
  const sql = fs.readFileSync(path.join(SCHEMAS_DIR, 'webhooks.sql'), 'utf8')
  await db.none(sql)
  console.log('[022_webhooks] applied schema: webhooks + webhook_deliveries')
}

exports.down = async (db) => {
  await db.none('DROP TABLE IF EXISTS webhook_deliveries CASCADE')
  await db.none('DROP TABLE IF EXISTS webhooks CASCADE')
  console.log('[022_webhooks] rolled back: webhooks + webhook_deliveries')
}
