/* global __dirname */
const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
    devtool: 'cheap-module-eval-source-map',
    mode: 'development',
    output: {
        filename: 'app.bundle.js',
        sourceMapFilename: 'app.bundle.map',
    },
    devServer: {
        historyApiFallback: true,
        stats: 'minimal',
    },
    optimization: { noEmitOnErrors: true },
});
