const { csrfProtection, generateToken } = require('./csrf')

module.exports = {
  cors: require('./cors'),
  securityHeaders: require('./security'),
  validate: require('../Validation').validate,
  csrfProtection,
  generateCsrfToken: generateToken,
}
