/* global __dirname */
const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
    devtool: 'eval-cheap-source-map',
    mode: 'development',
    output: {
        filename: 'app.bundle.js',
        sourceMapFilename: 'app.bundle.map',
    },
    devServer: {
        stats: 'normal',
    },
    optimization: { emitOnErrors: false },
});
