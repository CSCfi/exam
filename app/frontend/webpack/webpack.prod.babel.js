import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import webpack from 'webpack';
import merge from 'webpack-merge';

import common from './webpack.common.babel';

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
        }),
    ],
});
