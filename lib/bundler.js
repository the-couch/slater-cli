const path = require('path')
const rollup = require('rollup')

module.exports = function compiler (opts = {}) {
  const inputs = {
    input: opts.input,
    plugins: [
      require('rollup-plugin-postcss')({
        extract: true,
        minimize: true,
        sourceMap: true,
        plugins: [
          require('postcss-import')(),
          require('postcss-cssnext')({
            warnForDuplicates: false
          }),
          require('postcss-nested'),
          require('postcss-discard-comments')
        ]
      }),
      require('rollup-plugin-babel')({
        exclude: 'node_modules/**',
        babelrc: false,
        presets: [
          [require('@babel/preset-env').default, {
            modules: false
          }],
          [require('@babel/preset-react').default, {
            pragma: opts.jsx
          }],
        ],
        plugins: [
          [require('fast-async'), {
            spec: true
          }],
          [require('@babel/plugin-proposal-object-rest-spread'), {
            useBuiltIns: true,
            loose: true
          }],
          require('@babel/plugin-proposal-class-properties')
        ]
      }),
      require('rollup-plugin-node-resolve')({
        jsnext: true,
        main: true,
        browser: true
      }),
      require('rollup-plugin-commonjs')(),
      require('rollup-plugin-alias')({
        resolve: [ '.js', '.css' ],
        ...opts.alias
      }),
      opts.compress && (
        require('rollup-plugin-uglify')({
          output: {
            preamble: opts.banner
          }
        })
      )
    ].filter(Boolean)
  }

  const outputs = {
    file: opts.output,
    format: 'iife',
    banner: opts.banner,
    sourcemap: true
  }

  return {
    compile () {
      return rollup.rollup(inputs)
        .then(bundle => {
          bundle.write(outputs)
        })
    },
    watch () {
      const bundle = rollup.watch({
        ...inputs,
        output: outputs
      })

      let listeners = {}

      bundle.on('event', ({ code, error }) => {
        if (code === 'FATAL') {
          throw error
          process.exit(1)
          return
        }

        listeners[code] && listeners[code].map(l => l(error))
      })

      return {
        ...bundle,
        start (cb) {
          listeners.START = (listeners.START || []).concat(cb)
          return this
        },
        end (cb) {
          listeners.END = (listeners.END || []).concat(cb)
          return this
        },
        error (cb) {
          listeners.ERROR = (listeners.ERROR || []).concat(cb)
          return this
        }
      }
    }
  }
}
