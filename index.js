#! /usr/bin/env node
'use strict'

const pkg = require('./package.json')
const path = require('path')
const fs = require('fs')
const program = require('commander')
const theme = require('@shopify/themekit').command
const colors = require('colors')

program
  .version(pkg.version)
  .option('-w --watch', 'recursively watch src directory')
  .option('-e --env [env]', 'specify an environment')
  .option('-d, --deploy [env]', 'deploy a theme')
  .option('--debug', 'enable available debugging')
  .parse(process.argv)

if (program.debug) {
  process.env.DEBUG = '*'
}

const config = require('./lib/config.js')(program)

/**
 * Clear terminal bc it's prettier
 */
process.stdout.write('\x1B[2J\x1B[0f')

/**
 * Actions
 */
if (program.watch) {
  require('./lib/watch.js')(program, config)
} else if (program.deploy) {
  require('./lib/deploy.js')(program, config)
}
