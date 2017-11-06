const colors = require('colors')
const theme = require('@shopify/themekit').command
const compiler = require('./webpack.js')

module.exports = function build (program, config, deploy = false) {
  console.log('slater compiling compiling via webpack...'.grey)

  compiler.run((err, stats) => {
    if (err) {
      console.log(err)
      return
    }

    console.log('successfully compiled via webpack...'.green)

    if (deploy) {
      theme({
        args: [
          'replace', '--env', program.env || 'development'
        ]
      })
    }
  })
}
