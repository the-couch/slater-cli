#! /usr/bin/env node
'use strict'

/**
 * Clear terminal bc it's prettier
 */
process.stdout.write('\x1B[2J\x1B[0f')

const pkg = require('./package.json')
const path = require('path')
const fs = require('fs-extra')
const themekit = require('@slater/themekit')
const queue = require('function-rate-limit')
const c = require('ansi-colors')
const bili = require('bili')
const postcss = require('rollup-plugin-postcss')
const chokidar = require('chokidar')
const match = require('anymatch')
const yaml = require('yaml').default
const socket = require('./lib/socket.js')
const bundler = require('./lib/bundler.js')
const { log } = require('./lib/util.js')

const {
  _: args,
  config = 'slater.config.js',
  env = 'development',
  debug,
  ...props
} = require('minimist')(process.argv.slice(2))

const conf = require(dir(config))
const watch = args[0] === 'watch'
const build = args[0] === 'build'
const deploy = args[0] === 'deploy'

const ignoredFiles = [
  '**/scripts/**',
  '**/styles/**',
  /DS_Store/
]

try {
  ignoredFiles.concat(require('parse-gitignore')(fs.readFileSync(dir('.gitignore'))))
} catch (e) {}

const themeConfig = yaml.parse(fs.readFileSync(dir('build/config.yml'), 'utf8'))[env]

const theme = themekit({
  password: themeConfig.password,
  store: themeConfig.store,
  theme_id: themeConfig.theme_id,
  ignore_files: themeConfig.ignore_files
})

function dir (...args) {
  return path.join(process.cwd(), ...args)
}

function compiler (opts = {}) {
  return bundler({
    input: dir('/src/scripts/index.js'),
    output: dir('/build/assets/index.js'),
    alias: {
      scripts: dir('/src/scripts'),
      styles: dir('/src/styles')
    },
    banner: `
      (function (href) {
        const socketio = document.createElement('script')
        socketio.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.1.1/socket.io.slim.js'
        socketio.onload = init
        document.head.appendChild(socketio)
        function init () {
          var socket = io(href)
          socket.on('refresh', () => window.location.reload())
        }
      })('https://localhost:3001');
    `,
    compress: opts.compress
  })
}

function copyTheme () {
  return fs.copy(dir('src'), dir('build'), {
    filter: (src, dest) => {
      return !/scripts|styles/.test(src)
    }
  }).then(() => {
    log(c.green('copied theme to build/'))
  })
}

function watchFiles () {
  /**
   * From /src dir
   */
  chokidar.watch(dir('/src'), {
    persistent: true,
    ignoreInitial: true
  })
    .on('add', p => {
      if (match(ignoredFiles, p)) return

      const pathname = p.split('/src')[1]
      const dest = dir('/build', pathname)

      fs.copy(p, dest)
        .catch(e => {
          log(
            c.red(`copying ${pathname} failed`),
            e.message || e || ''
          )
        })
    })
    .on('change', p => {
      if (match(ignoredFiles, p)) return

      const pathname = p.split('/src')[1]
      const dest = dir('/build', pathname)

      fs.copy(p, dest)
        .catch(e => {
          log(
            c.red(`copying ${pathname} failed`),
            e.message || e || ''
          )
        })
    })
    .on('unlink', p => {
      if (match(ignoredFiles, p)) return

      const pathname = p.split('/src')[1]

      fs.remove(dir('/build', pathname))
        .catch(e => {
          log(
            c.red(`removing ${pathname} failed`),
            e.message || e || ''
          )
        })
    })

  /**
   * From /build dir
   */
  chokidar.watch(dir('/build'), {
    ignore: /DS_Store/,
    persistent: true,
    ignoreInitial: true
  })
    .on('add', p => {
      const pathname = p.split('/build')[1]

      theme.upload(pathname, p)
        .then(() => socket.emit('refresh'))
    })
    .on('change', p => {
      const pathname = p.split('/build')[1]

      theme.upload(pathname, p)
        .then(() => socket.emit('refresh'))
    })
    .on('unlink', p => {
      const pathname = p.split('/build')[1]

      theme.remove(pathname)
        .then(() => socket.emit('refresh'))
    })
}

if (watch) {
  copyTheme().then(() => {
    watchFiles()
    compiler().watch()
      .end(() => {
        log(c.green(`compiled js/css`))
      })
  })
} else if (build) {
  copyTheme().then(() => {
    compiler({ compress: true }).compile().then(() => {
      log(c.green(`compiled js/css`))
      process.exit()
    })
  })
} else if (deploy) {
  copyTheme().then(() => {
    compiler({ compress: true }).compile().then(() => {
      log(c.green(`compiled js/css`))
      process.exit()
    })
  })
}

