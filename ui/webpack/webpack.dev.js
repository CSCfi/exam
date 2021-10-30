/* global __dirname */
const { rules } = require('eslint-config-prettier');
const { merge } = require('webpack-merge');
const common = require('./webpack.common');

const tsloader = {
    test: /\.ts$/,
    use: [
        { loader: 'ts-loader', options: { transpileOnly: true, experimentalWatchApi: true } },
        { loader: 'angular2-template-loader' },
    ],
};
common.module.rules.push(tsloader);

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
