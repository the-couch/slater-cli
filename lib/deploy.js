const colors = require('colors')
const theme = require('@shopify/themekit').command
const compiler = require('./webpack.js')

module.exports = function deploy (program, config) {
  console.log('\n\tslater compiling javascript...'.grey)

  compiler.run((err, stats) => {
    if (err) {
      console.log(err)
      return
    }

    console.log('\tsuccessfully compiled javascript...'.green)

    theme({
      args: [
        'replace', '--env', typeof program.deploy === 'string' ? program.deploy : 'development'
      ]
    })
  })
}
