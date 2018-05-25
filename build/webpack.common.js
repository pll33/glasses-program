
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const config = {
  context: path.resolve(__dirname, '../src'),
  entry: ['./app/app.js'],
  output: {
    path: path.join(__dirname, '../dist'),
    filename: 'sourcecode.js',
    publicPath: 'assets/',
  },
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.js$/,
        include: /app/,
        exclude: /(node_modules|assets)/,
        use: {
          loader: 'eslint-loader',
        }
      },
      {
        test: /\.js$/,
        include: /app/,
        exclude: /(node_modules|assets)/,
        use: {
          loader: 'babel-loader',
        }
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(['dist'], { root: path.join(__dirname, '../')}),
    new CopyWebpackPlugin([{ from: 'public', ignore: ['*.DS_Store'] }])
  ],
};

module.exports = config;
