/* global __dirname */
const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
    devtool: 'eval-source-map',
    mode: 'development',
    entry: [
        'webpack/hot/dev-server',
        'webpack-dev-server/client?http://localhost:8080'
    ],
    plugins: [
        new webpack.HotModuleReplacementPlugin()
    ]
});
