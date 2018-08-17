#! /usr/bin/env node
'use strict'

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

const dir = (...args) => path.join(process.cwd(), ...args)

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

let ignoredFiles = [
  'scripts/**',
  'styles/**',
  /DS_Store/
]
try {
  ignoredFiles.concat(require('parse-gitignore')(fs.readFileSync(dir('.gitignore'))))
} catch (e) {}

const server = require('https').createServer({
  key: fs.readFileSync(__dirname + '/lib/cert/server.key'),
  cert: fs.readFileSync(__dirname + '/lib/cert/server.crt')
}, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  })
  res.write('slater running')
  res.end()
})

const io = require('socket.io')(server, {
  serveClient: false
})

// io.on('connection', () => {
//   console.log('connected')
// })

server.listen(3001)

/**
 * Clear terminal bc it's prettier
 */
// process.stdout.write('\x1B[2J\x1B[0f')

const themeConfig = yaml.parse(fs.readFileSync(dir('config.yml'), 'utf8'))[env]

const theme = themekit({
  password: themeConfig.password,
  store: themeConfig.store,
  theme_id: themeConfig.theme_id,
  ignore_files: themeConfig.ignore_files
})

const tasks = {
  watch () {
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
        fs.copy(p, dest).catch(e => {
          console.log(c.magenta(`copying ${pathname} failed`), e || '')
        })
      })
      .on('change', p => {
        if (match(ignoredFiles, p)) return
        const pathname = p.split('/src')[1]
        const dest = dir('/build', pathname)
        fs.copy(p, dest).catch(e => {
          console.log(c.magenta(`copying ${pathname} failed`), e || '')
        })
      })
      .on('unlink', p => {
        if (match(ignoredFiles, p)) return
        const pathname = p.split('/src')[1]
        fs.remove(dir('/build', pathname)).catch(e => {
          console.log(c.magenta(`removing ${pathname} failed`), e || '')
        })
      })

    theme.upload('templates/index.liquid', dir('build/templates/index.liquid'))
      .then(res => {
        console.log(res)
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
          .then(() => {
            io.emit('refresh')
          })
          .catch(e => {
            console.log(c.magenta(`uploading ${pathname} failed`), e || '')
          })
      })
      .on('change', p => {
        const pathname = p.split('/build')[1]

        theme.upload(pathname, p)
          .then(() => {
            io.emit('refresh')
          })
          .catch(e => {
            console.log(c.magenta(`updating ${pathname} failed`), e || '')
          })
      })
      .on('unlink', p => {
        const pathname = p.split('/build')[1]

        theme.upload(pathname, p)
          .then(() => {
            io.emit('refresh')
          })
          .catch(e => {
            console.log(c.magenta(`removing ${pathname} failed`), e || '')
          })
      })
  },
  copyTheme () {
    return fs.copy(dir('src'), dir('build'), {
      filter: (src, dest) => {
        return !/scripts|styles/.test(src)
      }
    }).then(() => {
      console.log(c.green(`  Copied theme.`))
    })
  },
  compile () {
    return bili.write({
      input: dir('/src/scripts/index.js'),
      outDir: dir('/build/assets'),
      filename: 'index.js',
      format: [ watch ? 'iife' : 'iife-min' ],
      target: 'browser',
      watch: watch,
      banner: watch ? `
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
      ` : ``,
      jsx: props.jsx || 'React.createElement',
      plugins: [
        require('rollup-plugin-alias')({
          resolve: [ '.js', '.css' ],
          scripts: dir('/src/scripts'),
          styles: dir('/src/styles')
        })
      ],
      postcss: {
        extract: !watch,
        minimize: true,
        plugins: [
          require('postcss-import')(),
          require('postcss-cssnext')({
            warnForDuplicates: false
          }),
          require('postcss-nested'),
          require('postcss-discard-comments')
        ]
      }
    })
      .catch(e => {
        console.error('compilation error', e)
      })
  }
}

if (watch) {
  tasks.watch()
  tasks.compile()
} else if (build) {
  tasks.copyTheme()
    .then(tasks.compile)
} else if (deploy) {
  tasks.copyTheme()
    .then(tasks.compile)
    .then(() => theme('replace'))
    .catch(e => {
      console.error(e)
    })
}

