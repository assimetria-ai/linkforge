// @system — add stripe_customer_id to subscriptions table
module.exports = {
  name: '006_stripe_customer_id',
  async up(db) {
    await db.none(`
      ALTER TABLE subscriptions
        ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

      CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id
        ON subscriptions(stripe_customer_id);
    `)
  },
  async down(db) {
    await db.none(`
      DROP INDEX IF EXISTS idx_subscriptions_stripe_customer_id;
      ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_customer_id;
    `)
  },
}
