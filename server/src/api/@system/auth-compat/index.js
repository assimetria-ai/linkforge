// @system — backward-compat aliases for /auth/* → actual endpoints
// POST /auth/login    → POST /sessions
// POST /auth/register → POST /users
// GET  /auth/me       → GET  /sessions/me
const express = require('express')
const router = express.Router()
const sessionsRouter = require('../sessions')
const usersRouter = require('../user')

router.post('/auth/login', (req, res, next) => {
  req.url = '/sessions'
  sessionsRouter(req, res, next)
})

router.post('/auth/register', (req, res, next) => {
  req.url = '/users'
  usersRouter(req, res, next)
})

router.get('/auth/me', (req, res, next) => {
  req.url = '/sessions/me'
  sessionsRouter(req, res, next)
})

module.exports = router
