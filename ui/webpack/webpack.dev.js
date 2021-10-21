/* global __dirname */
const { merge } = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
    entry: ['./src/env/dev/main.ts'],
    target: 'web',
    devtool: 'eval-cheap-module-source-map',
    mode: 'development',
    output: {
        filename: 'app.bundle.js',
        sourceMapFilename: 'app.bundle.map',
        pathinfo: false,
    },
    devServer: {
        devMiddleware: {
            stats: 'minimal',
        },
        hot: 'only',
    },
    optimization: {
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
        emitOnErrors: false,
    },
});
