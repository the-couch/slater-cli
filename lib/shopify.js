const theme = require('@shopify/themekit').command
const queue = require('function-rate-limit')

module.exports = queue(2, 1000, function (action = 'upload', name, done, bs) {
  theme({
    args: [
      action, '--env', program.env || 'development', name
    ],
    logLevel: 'silent'
  }, e => {
    if (e) {
      console.error(e)
    } else {
      if (!/\.js/.test(name)) {
        bs.reload()
      }

      done()
    }
  })
})
