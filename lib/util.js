const c = require('ansi-colors')

function log (...args) {
  console.log(
    c.gray(`@slater/cli`),
    ...args
  )
}

module.exports = {
  log
}
