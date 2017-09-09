const theme = require('@shopify/themekit').command
const compiler = require('./webpack.js')

module.exports = function deploy (program, config) {
  return () => {
    compiler.run((err, stats) => {
      if (err) console.log(err)
      console.log('done')

      theme({
        args: [
          'replace', '--env', program.deploy
        ]
      })
    })
  }
}
