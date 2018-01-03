/* global __dirname */
require('webpack');
const path = require('path');
console.log(__dirname);
const buildPath = path.resolve(__dirname, '../../../public/bundles/');

/**
 * Base configuration object for Webpack
 */
const config = {
    entry: [
        './src/app.module.js'
    ],
    output: {
        path: buildPath,
        filename: 'bundle.js',
        sourceMapFilename: 'bundle.map',
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
                test: /\.(woff2?|ttf|eof|eot)$/,
                use: 'file-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js', '.json', '.css', '.html']
    }
};

module.exports = config;
