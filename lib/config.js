const path = require('path')
const fs = require('fs')
const yaml = require('js-yaml')
const merge = require('deepmerge')

/**
 * Load required config.yml file
 */
const shopifyConfig = yaml.safeLoad(
  fs.readFileSync(
    path.join(process.cwd() + '/config.yml')
  )
)

/**
 * Default config for each
 * env within the config.yml
 * required by Shopify.
 *
 * We really only need the directory,
 * so we set a default here, same
 * as Shopify.
 */
const defaultConfig = {
  directory: 'src'
}

/**
 * Merge config.yml with
 * any defaults we need
 */
module.exports = function getConfig (program) {
  return merge(shopifyConfig, Object.keys(shopifyConfig).reduce((conf, k) => {
    conf[k] = merge(conf[k], defaultConfig)
    return conf
  }, {}))[program.env || 'development']
}
