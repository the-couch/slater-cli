process.env.SLATER_HMR = true

const fs = require('fs')
const http = require('https')
const watcher = require('node-watch')
const theme = require('@shopify/themekit').command
const io = require('socket.io')(http)
const colors = require('colors')
const app = require('express')()

const compiler = require('./webpack.js')
const webpackDevMiddleware = require('webpack-dev-middleware')
const webpackHotMiddleware = require('webpack-hot-middleware')

// @see https://github.com/webpack/webpack-dev-server/tree/master/examples/https
const ssl = {
  key: fs.readFileSync(__dirname + '/cert/server.key'),
  cert: fs.readFileSync(__dirname + '/cert/server.crt')
}

module.exports = function watch (program, config) {
  const server = http.createServer(ssl, app)

  server.listen(3000, () => {
    console.log(`slater watching ${config.directory} for changes`.rainbow)
  })

  app.use(webpackDevMiddleware(compiler, {
    noInfo: true,
    publicPath: '/',
    stats: 'errors-only'
  }))

  app.use(webpackHotMiddleware(compiler))

  app.get('/', (req, res) => {
    res.send('slater is running! 🤓').end()
  })

  const io = require('socket.io')(server, {
    serveClient: false
  })

  watcher(config.directory, {
    recursive: true,
    filter: filepath => {
      return !/scripts|styles/.test(filepath);
    }
  }, (e, name) => {
    if (e === 'update') {
      console.log(`uploading ${name}...`.grey)
      theme({
        args: [
          'upload', '--env', program.env || 'development', name
        ],
        logLevel: 'silent'
      }, e => {
        if (e) {
          throw new Error(e)
        } else {
          if (!/\.js/.test(name)) {
            io.emit('refresh')
          }
          console.log(`successfully uploaded ${name}, refreshing...`.green)
        }
      })
    } else if (e === 'remove') {
      console.log(`tremoving ${name}...`.grey)
      theme({
        args: [
          'remove', '--env', program.env || 'development', name
        ],
        logLevel: 'silent'
      }, e => {
        if (e) {
          throw new Error(e)
        } else {
          if (!/\.js/.test(name)) {
            io.emit('refresh')
          }
          console.log(`successfully removed ${name}, refreshing...`.magenta)
        }
      })
    }
  })
}
