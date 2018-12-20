const webpack = require('webpack')

module.exports = {
  context: __dirname + '/src',
  entry: ['regenerator-runtime/runtime', './index'],
  output: {
    path: __dirname + '/dist',
    filename: 'bundle.js'
  },
  devServer: {
    historyApiFallback: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  },
  node: {
    fs: 'empty',
    child_process: 'empty',
    crypto: true,
    util: true,
    stream: true,
    path: 'empty',
  },
  externals: {
    shelljs: 'commonjs shelljs',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    })
  ],
  optimization: {
    minimizer: []
  }
}
