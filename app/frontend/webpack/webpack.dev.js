/* global __dirname */
const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
    target: 'web',
    devtool: 'eval-source-map',
    mode: 'development',
    output: {
        filename: 'app.bundle.js',
        sourceMapFilename: 'app.bundle.map',
    },
    devServer: {
        stats: 'normal',
        hot: true,
    },
    optimization: { emitOnErrors: false },
});
