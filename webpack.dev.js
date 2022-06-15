
const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')

module.exports = {

  // https://webpack.js.org/configuration/mode/
  mode: 'development',

  // This option controls if and how source maps are generated.
  // https://webpack.js.org/configuration/devtool/
  devtool: 'eval-cheap-module-source-map',

  // https://webpack.js.org/concepts/entry-points/#multi-page-application
  entry: {
    document: './src/page-document/main.js',
    login: './src/page-login/main.js',
    index: './src/page-index/main.js',
  },

  // https://webpack.js.org/configuration/dev-server/
  devServer: {
    port: 8080,
    devMiddleware: {
      writeToDisk: false // https://webpack.js.org/configuration/dev-server/#devserverwritetodisk-
    }
  },

  // https://webpack.js.org/concepts/loaders/
  module: {
    rules: [
      {
        // https://webpack.js.org/loaders/babel-loader/#root
        test: /\.m?js$/i,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {"useBuiltIns": "usage", "corejs": 3, "targets": "> 0.25%, not dead"}],
              '@babel/preset-react'
            ]
          }
        }
      },
      {
        // https://webpack.js.org/loaders/css-loader/#root
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        // https://webpack.js.org/guides/asset-modules/#resource-assets
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource'
      },
      {
        // https://webpack.js.org/guides/asset-modules/#replacing-inline-loader-syntax
        resourceQuery: /raw/,
        type: 'asset/source'
      },
      {
        // https://webpack.js.org/loaders/html-loader/#usage
        resourceQuery: /template/,
        loader: 'html-loader'
      }
    ]
  },

  // https://webpack.js.org/concepts/plugins/
  plugins: [
    new webpack.DefinePlugin({
      // The location of the midas-loop backend service, which the UI needs to communicate with.
      // This should be something like "http://your.domain.com:3000/api".
      API_ENDPOINT: JSON.stringify("http://localhost:3000/api"),
      // The probability under which a label probability provided by an NLP service is viewed as 
      // "suspicious" by the UI. Suspicious labels are graphically indicated as such in the UI.
      SUSPICIOUS_PROBABILITY_THRESHOLD: 0.9,
    }),
    new HtmlWebpackPlugin({
      template: './src/page-document/tmpl.html',
      inject: true,
      chunks: ['document'],
      filename: 'document.html'
    }),
    new HtmlWebpackPlugin({
      template: './src/page-login/tmpl.html',
      inject: true,
      chunks: ['login'],
      filename: 'login.html'
    }),
    new HtmlWebpackPlugin({
      template: './src/page-index/tmpl.html',
      inject: true,
      chunks: ['index'],
      filename: 'index.html'
    })
  ]
}
