import {TypedCssModulesPlugin} from '../../../src';
import * as path from 'path';
import webpack = require('webpack');

const config: webpack.Configuration = {
  context: __dirname,
  entry: './index',
  module: {
    rules: [{test: /\.css$/, use: 'css-loader'}],
  },
  plugins: [
    new TypedCssModulesPlugin({
      globPattern: path.join(__dirname, '**/*.css'),
    }),
  ],
};
module.exports = config;
