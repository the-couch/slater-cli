const p = process.env.NODE_ENV === 'production'
const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const merge = require('deepmerge')
const MinifyPlugin = require("babel-minify-webpack-plugin")

const HMR = process.env.SLATER_HMR === 'true'

const userConfig = require(
  path.join(process.cwd() + '/webpack.config.js')
)

const entry = HMR ? [
  path.join(__dirname, '../node_modules/webpack-hot-middleware/client?dynamicPublicPath=true'),
] : []

const output = HMR ? {
  path: __dirname,
  filename: 'index.js',
  publicPath: '//localhost:3000',
} : {}

const plugins = [
  ...(HMR ? [
    new webpack.HotModuleReplacementPlugin()
  ] : [
    new MinifyPlugin()
  ]),
  new webpack.NoEmitOnErrorsPlugin(),
  new webpack.DefinePlugin({
    SLATER_HMR: process.env.SLATER_HMR || false
  })
]

module.exports = webpack(
  merge({
    entry,
    output,
    plugins
  }, userConfig)
)
