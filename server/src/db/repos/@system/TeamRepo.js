// @system — TeamRepo: database access layer for teams

'use strict'

const db = require('../../../lib/@system/PostgreSQL')

const TeamRepo = {
  /** Return a single team by id, or null. */
  async findById(id) {
    return db.oneOrNone('SELECT * FROM teams WHERE id = $1', [id])
  },

  /** Return true if a team with the given id exists. */
  async exists(id) {
    const row = await db.oneOrNone('SELECT id FROM teams WHERE id = $1', [id])
    return !!row
  },

  /**
   * Return all teams the user belongs to, newest first.
   * Each row includes the user's role and the team's total member count.
   */
  async findByUser(userId) {
    return db.any(
      `SELECT t.id, t.name, t.created_at, tm.role AS user_role,
              (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
         FROM teams t
         JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
        ORDER BY t.created_at DESC`,
      [userId]
    )
  },

  /**
   * Create a team and make the creator the owner in a single transaction.
   * Returns the new team row.
   */
  async create({ name, createdBy }) {
    return db.tx(async t => {
      const team = await t.one(
        'INSERT INTO teams (name, created_by) VALUES ($1, $2) RETURNING *',
        [name.trim(), createdBy]
      )
      await t.none(
        'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
        [team.id, createdBy, 'owner']
      )
      return team
    })
  },

  /** Rename a team. Returns the updated row. */
  async update(id, { name }) {
    return db.one(
      'UPDATE teams SET name = $2, updated_at = now() WHERE id = $1 RETURNING *',
      [id, name.trim()]
    )
  },

  /** Delete a team (cascades to members and invites). */
  async delete(id) {
    return db.none('DELETE FROM teams WHERE id = $1', [id])
  },
}

module.exports = TeamRepo
