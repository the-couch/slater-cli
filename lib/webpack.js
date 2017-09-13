const p = process.env.NODE_ENV === 'production'
const path = require('path')
const webpack = require('webpack')
const merge = require('webpack-merge')
const MinifyPlugin = require("babel-minify-webpack-plugin")

module.exports = function watch (program, config, watch = false) {

  const userConfig = require(
    path.join(process.cwd() + '/webpack.config.js')
  )

  let {entry} = userConfig
  let {proxy} = config

  const HMR_URL = `webpack-hot-middleware/client?${proxy}&reload=true`

  watch ? (
    Array.isArray(entry) ?
    entry.push(HMR_URL) :
    entry = [entry, HMR_URL]
  ) : null

  let webpackConfig = merge(userConfig, {
    entry, 
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
        new MinifyPlugin()
      ]),
      // new webpack.NoEmitOnErrorsPlugin(),
      new webpack.DefinePlugin({
        SLATER_HMR: watch
      })
    ]
  })

  return webpack(webpackConfig)
}
