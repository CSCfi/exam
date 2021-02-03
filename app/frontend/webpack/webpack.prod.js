/* global __dirname */
const path = require('path');
const merge = require('webpack-merge');
const common = require('./webpack.common');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(common, {
    devtool: 'source-map',
    mode: 'production',
    output: {
        filename: '[name].[contenthash].js',
        //chunkFilename: '[id].[contenthash].chunk.js'
    },
    optimization: {
        emitOnErrors: false,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
            chunks: 'all',
            maxInitialRequests: Infinity,
            minSize: 0,
            cacheGroups: {
                defaultVendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name(module) {
                        // get the name. E.g. node_modules/packageName/not/this/part.js
                        // or node_modules/packageName
                        const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];

                        // npm package names are URL-safe, but some servers don't like @ symbols
                        return `npm.${packageName.replace('@', '')}`;
                    },
                },
            },
        },
    },
    plugins: [
        new webpack.IgnorePlugin({
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/,
        }),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, './index.ejs'),
            inject: true,
            scriptLoading: 'defer',
            filename: path.resolve(__dirname, '../../../public/index.html'),
        }),
    ],
});
