const path = require('path')


// import { Configuration } from 'webpack'
/**
 * @type {Configuration}
 */
const config = {
  mode: 'none',
  entry: './src/main.js', // 入口
  output: {
    filename: 'bundel.js',
    path: path.join(__dirname, 'output')
  }
}

module.exports = config