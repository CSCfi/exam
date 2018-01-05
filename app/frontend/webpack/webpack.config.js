/* global __dirname */
const path = require('path');
const webpack = require('webpack');

module.exports = exports = Object.create(require('./webpack.base.config.js'));

exports.devtool = 'eval-source-map';
exports.entry = Object.assign(exports.entry,
    {
        hot: 'webpack/hot/dev-server',
        srv: 'webpack-dev-server/client?http://localhost:8080'
    }
);

exports.plugins = [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.ProvidePlugin({
        'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
    }),
    new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery',
        'window.jQuery': 'jquery'
    })
];
