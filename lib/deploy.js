const colors = require('colors')

module.exports = function deploy (program, config, compiler) {
  console.log('slater compiling javascript...'.grey)

  compiler.run((err, stats) => {
    if (err) {
      console.log(err)
      return
    }

    console.log('successfully compiled javascript...'.green)

    if (config.platform === 'shopify') {
      theme({
        args: [
          'replace', '--env', program.env || 'development'
        ]
      })
    }

  })
}
