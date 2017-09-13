const fs = require('fs')
const path = require('path')
const watcher = require('node-watch')
const colors = require('colors')
const ignore = require('gitignore-parser')
const browserSync = require('browser-sync').create();
const gitignore = ignore.compile(fs.readFileSync(
  path.join(process.cwd(), '/.gitignore')
, 'utf8'))

const webpackDevMiddleware = require('webpack-dev-middleware')
const webpackHotMiddleware = require('webpack-hot-middleware')
const push = require('./shopify')

// @see https://github.com/webpack/webpack-dev-server/tree/master/examples/https
const ssl = {
  key: fs.readFileSync(__dirname + '/cert/server.key'),
  cert: fs.readFileSync(__dirname + '/cert/server.crt')
}

module.exports = function watch (program, config, compiler) {
  let {proxy, target, platform} = config
  const isShopify = platform === 'shopify'
  const isSSL = /^https:/.test(proxy)

  let folder = platform === 'wordpress' 
    ? `wp-content${(process.cwd().split('wp-content')[1])}/assets/js`
    : ''

  const https = /^https:/.test(proxy)
   ? ssl : false

  browserSync.init({
    proxy: {
      target,
      middleware: [
        webpackDevMiddleware(compiler, {
          publicPath: `${proxy}/${folder}`,
          noInfo: true,
        }),
        webpackHotMiddleware(compiler),
      ],
    },
    notify: false,
    https,
  })

  watcher(config.directory, {
    recursive: true,
    filter: filepath => {
      return !/\.js|\.css$/.test(filepath);
    }
  }, (e, name) => {
    if (gitignore.denies(name)) {
      console.log(`ignoring change to ${name} as per .gitignore`.grey)
      return
    }

    if (e === 'update') {
      console.log(`${name} updated...`.grey)

      if (isShopify) {
        push('upload', name, () => {
          console.log(`successfully uploaded ${name}, refreshing...`.green)
        }, browserSync)
      } else {
        browserSync.reload()
      }
    } else if (e === 'remove') {
      console.log(`removing ${name}...`.grey)
      if (isShopify) {
        push('remove', name, () => {
          console.log(`successfully removed ${name}, refreshing...`.magenta)
        }, browserSync)
      } else {
        browserSync.reload()
      }
    }
  })
}
