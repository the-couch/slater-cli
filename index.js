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
const mm = require('micromatch')
const yaml = require('yaml').default
const onExit = require('exit-hook')
const exit = require('exit')
const { socket, closeServer } = require('./lib/socket.js')
const bundler = require('./lib/bundler.js')
const { log } = require('./lib/util.js')

const {
  _: args,
  // config = 'slater.config.js',
  env = 'development',
  debug,
  ...props
} = require('minimist')(process.argv.slice(2))

if (debug) {
  require('inspector').open()
}

// const conf = require(dir(config))
const watch = args[0] === 'watch'
const deploy = args[0] === 'deploy'
const build = args[0] === 'build' || (!watch && !deploy)

const ignoredFiles = [
  '**/scripts/**',
  '**/styles/**',
  /DS_Store/
]

try {
  ignoredFiles.concat(require('parse-gitignore')(fs.readFileSync(dir('.gitignore'))))
} catch (e) {}

const themeConfig = yaml.parse(fs.readFileSync(dir('src/config.yml'), 'utf8'))[env]

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
    banner: watch ? `
      (function (href) {
        const socketio = document.createElement('script')
        socketio.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.1.1/socket.io.slim.js'
        socketio.onload = function init () {
          var socket = io(href)
          socket.on('connect', () => console.log('@slater/cli connected'))
          socket.on('refresh', () => window.location.reload())
        }
        document.head.appendChild(socketio)
      })('https://localhost:3000');
    ` : '',
    compress: opts.compress
  })
}

function copyTheme () {
  return fs.copy(dir('src'), dir('build'), {
    filter: (src, dest) => {
      return !/scripts|styles/.test(src)
    }
  })
    .then(() => {
      log(c.green('copied theme to build/'))
    })
    .catch(e => {
      log(c.red('theme copy failed'), e.message || e)
    })
}

function watchFiles (recompile) {
  function match (p) {
    if (mm.any(p, ignoredFiles)) {
      if (mm.contains(p, ['*.css'])) recompile()
      return true
    }
  }

  /**
   * From /src dir
   */
  chokidar.watch(dir('/src'), {
    persistent: true,
    ignoreInitial: true
  })
    .on('add', p => {
      if (match(p)) return

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
      if (match(p)) return

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
      if (match(p)) return

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
  onExit(() => {
    closeServer()
  })

  copyTheme().then(() => {
    const watcher = compiler().watch().end(() => {
      log(c.green(`compiled`))
    })

    watchFiles(function recompile () {
      watcher.tasks.forEach(task => {
        const style = task.cache.modules.filter(mod => {
          if (/\.css/.test(mod.id)) {
            mod.transformDependencies = [mod.id]
            return mod
          }
        })[0]

        if (style) {
          task.invalidate(style.id, true)
        }
      })
    })
  })
} else if (build) {
  copyTheme().then(() => {
    compiler({ compress: true }).compile()
      .then(() => {
        log(c.green(`compiled`))
        exit()
      })
      .catch(e => log(c.red('compilation'), e.message || e))
  })
} else if (deploy) {
  copyTheme().then(() => {
    compiler({ compress: true }).compile()
      .then(() => {
        log(c.green(`compiled`))
        theme.deploy('/build')
          .then(() => {
            log(c.green(`deployed to ${env} theme`))
            exit()
          })
          .catch(e => {
            log(c.red('deploy failed'), e)
            exit()
          })
      })
      .catch(e => log(c.red('compilation'), e.message || e))
  })
}

