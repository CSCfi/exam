/* global __dirname */
const merge = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
    target: 'web',
    devtool: 'eval-cheap-module-source-map',
    mode: 'development',
    output: {
        filename: 'app.bundle.js',
        sourceMapFilename: 'app.bundle.map',
        pathinfo: false,
    },
    devServer: {
        stats: 'minimal',
        hot: true,
    },
    optimization: {
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
        emitOnErrors: false,
    },
});
