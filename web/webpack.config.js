const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')
const CopyPlugin = require("copy-webpack-plugin")
const path = require('path')

const production = process.env.NODE_ENV === 'production'

module.exports = {
  mode: production ? 'production' : 'development',
  devtool: production ? 'source-map' : 'inline-source-map',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ttf$/,
        use: ['file-loader'],
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    symlinks: true,
    alias: {
      'n-lang': path.resolve(__dirname, '../js/src/'),
      // Ignore some Node modules
      'util': false,
      'assert': false,
      'colors/safe': false,
    },
  },
  plugins: [
    new MonacoWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        { from: './static' }
      ]
    }),
  ],
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
  },
}
