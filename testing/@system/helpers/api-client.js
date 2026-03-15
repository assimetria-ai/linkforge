/**
 * @system/testing — API Test Client
 *
 * Supertest wrapper with convenience methods for API testing.
 */

const request = require('supertest')

/**
 * Create an API test client from an Express app.
 * @param {object} app - Express application
 * @returns {object} wrapped supertest agent with helpers
 */
function createApiClient(app) {
  const agent = request(app)

  return {
    agent,

    /** GET with optional auth */
    get(url, token) {
      const req = agent.get(url)
      if (token) req.set('Authorization', `Bearer ${token}`)
      return req
    },

    /** POST with JSON body and optional auth */
    post(url, body, token) {
      const req = agent.post(url).send(body)
      if (token) req.set('Authorization', `Bearer ${token}`)
      return req
    },

    /** PUT with JSON body and optional auth */
    put(url, body, token) {
      const req = agent.put(url).send(body)
      if (token) req.set('Authorization', `Bearer ${token}`)
      return req
    },

    /** PATCH with JSON body and optional auth */
    patch(url, body, token) {
      const req = agent.patch(url).send(body)
      if (token) req.set('Authorization', `Bearer ${token}`)
      return req
    },

    /** DELETE with optional auth */
    delete(url, token) {
      const req = agent.delete(url)
      if (token) req.set('Authorization', `Bearer ${token}`)
      return req
    },

    /**
     * Assert a standard list response shape.
     * @param {object} res - supertest response
     * @param {object} [opts] - expected fields
     */
    assertListResponse(res, opts = {}) {
      expect(res.status).toBe(opts.status || 200)
      expect(res.body).toHaveProperty('data')
      expect(Array.isArray(res.body.data)).toBe(true)
      if (opts.minLength !== undefined) {
        expect(res.body.data.length).toBeGreaterThanOrEqual(opts.minLength)
      }
      if (opts.total !== undefined) {
        expect(res.body.total || res.body.meta?.total).toBe(opts.total)
      }
    },

    /**
     * Assert an error response.
     * @param {object} res - supertest response
     * @param {number} status - expected HTTP status
     * @param {string} [message] - expected error message substring
     */
    assertError(res, status, message) {
      expect(res.status).toBe(status)
      if (message) {
        const errMsg = res.body.error || res.body.message || ''
        expect(errMsg.toLowerCase()).toContain(message.toLowerCase())
      }
    },
  }
}

module.exports = { createApiClient }
