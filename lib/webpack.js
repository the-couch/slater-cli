const p = process.env.NODE_ENV === 'production'
const path = require('path')
const webpack = require('webpack')
const merge = require('webpack-merge')
const MinifyPlugin = require("babel-minify-webpack-plugin")
const ExtractTextPlugin = require("extract-text-webpack-plugin")
const colors = require('colors')

module.exports = function watch (program, config, watch = false) {

  const userConfig = require(
    path.join(process.cwd() + '/webpack.config.js')
  )

  let {entry, output} = userConfig
  let {proxy, publicPath} = config

  const HMR_URL = 'webpack-hot-middleware/client'

  watch ? (
    Array.isArray(entry) ?
    entry.push(HMR_URL) :
    userConfig.entry = [entry, HMR_URL]
  ) : null

  output.publicPath = publicPath

  let webpackConfig = merge(userConfig, {
    resolve: {
      modules: [
        path.resolve(__dirname, "../node_modules"), "node_modules"
      ]
    },
    resolveLoader: {
      modules: [
        path.resolve(__dirname, "../node_modules"), "node_modules"
      ]
    },
    plugins: [
      ...(watch ? [
        new webpack.HotModuleReplacementPlugin()
      ] : [
        new ExtractTextPlugin("[name].min.css"),
        new MinifyPlugin()
      ]),
      new webpack.DefinePlugin({
        SLATER_HMR: watch
      })
    ]
  })

  let {rules = []} = (webpackConfig.module || {})
  rules.map(rule => {
    let {extract, use} = rule
    if (!extract) return 
    delete rule.extract
    if (!watch) return
    if (![].isArray(use)) {
      console.log('extract rule "use" property must be array'.red)
      process.exit(1)
    }
    if (use.length < 2) {
      console.log('extract rule "use" property must have at least 2 elements'.red)
      process.exit(1)
    }

    rule.use = ExtractTextPlugin.extract({fallback: use[0], use: use.splice(1)})
  })

  return webpack(webpackConfig)
}
