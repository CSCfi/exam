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
    },
    optimization: {
        runtimeChunk: 'single',
        splitChunks: {
            chunks: 'all',
            maxInitialRequests: Infinity,
            minSize: 0,
            cacheGroups: {
                vendor: {
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
        new webpack.HashedModuleIdsPlugin(), // so that file hashes don't change unexpectedly
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, '../../backend/views/index.ejs'),
            inject: 'head',
            filename: path.resolve(__dirname, '../../backend/views/index.scala.html'),
        })
    ]
});
