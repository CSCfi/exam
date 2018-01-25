/* global __dirname */
require('webpack');
const path = require('path');
console.log(__dirname);
const buildPath = path.resolve(__dirname, '../../../public/bundles/');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/**
 * Base configuration object for Webpack
 */
const config = {
    entry: [
        './src/app.module.ts'
    ],
    output: {
        path: buildPath,
        filename: 'app.bundle.js',
        sourceMapFilename: 'app.bundle.map',
        publicPath: '/bundles/'
    },
    externals: {},
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.less$/,
                use: ['style-loader', 'css-loader', 'less-loader']
            },
            {
                test: /\.scss$/,
                use: ['style-loader', 'css-loader', 'sass-loader']
            },
            {
                test: /\.ts$/,
                use: 'awesome-typescript-loader'
            },
            {
                test: /\.js$/,
                use: ['ng-annotate-loader', 'babel-loader'],
                exclude: /node_modules/
            },
            {
                test: /\.json$/,
                use: 'json-loader'
            },
            {
                test: /\.(jpg|png|svg)$/,
                use: 'url-loader?limit=100000'
            },
            {
                test: /\.html$/,
                use: 'ng-cache-loader?prefix=[dir]/[dir]',
                exclude: '/node_modules/'
            },
            {
                test: /\.(woff|woff2|ttf|eof|eot)$/,
                use: 'url-loader'
            }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
        }),
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery'
        }),
        new CleanWebpackPlugin(['bundles'], { root: path.resolve(__dirname, '../../../public') }),
        new HtmlWebpackPlugin({ title: 'Production' })
    ],
    resolve: {
        extensions: ['.ts', '.js', '.json', '.css', '.html']
    }
};

module.exports = config;
