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
  return () => {
    process.env.SLATER_HMR = true

    const server = http.createServer(ssl, app)

    server.listen(3000, () => {
      console.log(`primers watching ${config.directory} for changes`.rainbow)
    })

    app.use(webpackDevMiddleware(compiler, {
      publicPath: '/',
      stats: {
        colors: true,
      }
    }))

    app.use(webpackHotMiddleware(compiler))

    app.get('/', (req, res) => {
      res.send('primers').end()
    })

    const io = require('socket.io')(server, {
      serveClient: false,
      // pingInterval: 10000,
      // pingTimeout: 5000,
      // cookie: false
    })

    watcher(config.directory, {
      recursive: true,
      filter: filepath => {
        return !/scripts|styles/.test(filepath);
      }
    }, (e, name) => {
      if (e === 'update') {
        console.log(`\n\tuploading ${name}...`.grey)
        theme({
          args: [
            'upload', '--env', program.env, name
          ],
          logLevel: 'silent'
        }, e => {
          if (e) {
            throw new Error(e)
          } else {
            if (!/\.js/.test(name)) {
              io.emit('refresh')
            }
            console.log(`\tsuccessfully uploaded ${name}, refreshing...`.green)
          }
        })
      }
    })
  }
}
