process.env.SLATER_HMR = true

const fs = require('fs')
const path = require('path')
const http = require('https')
const watcher = require('node-watch')
const theme = require('@shopify/themekit').command
const io = require('socket.io')(http)
const colors = require('colors')
const app = require('express')()
const queue = require('function-rate-limit')
const ignore = require('gitignore-parser')
const gitignore = ignore.compile(fs.readFileSync(
  path.join(process.cwd(), '/.gitignore')
, 'utf8'))

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
    publicPath: 'https://localhost:3000/',
    stats: 'errors-only',
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  }))

  app.use(webpackHotMiddleware(compiler))

  app.get('/', (req, res) => {
    res.send('slater is running! 🤓').end()
  })

  const io = require('socket.io')(server, {
    serveClient: false
  })

  const push = queue(2, 1000, function (action = 'upload', name, done) {
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
          io.emit('refresh')
        }

        done()
      }
    })
  })

  watcher(config.directory, {
    recursive: true,
    filter: filepath => {
      return !/scripts|styles|DS_Store/.test(filepath);
    }
  }, (e, name) => {
    if (gitignore.denies(name)) {
      console.log(`ignoring change to ${name} as per .gitignore`.grey)
      return
    }

    if (e === 'update') {
      console.log(`uploading ${name}...`.grey)

      push('upload', name, () => {
        console.log(`successfully uploaded ${name}, refreshing...`.green)
      })
    } else if (e === 'remove') {
      console.log(`removing ${name}...`.grey)

      push('remove', name, () => {
        console.log(`successfully removed ${name}, refreshing...`.magenta)
      })
    }
  })
}
