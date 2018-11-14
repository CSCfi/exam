/* global __dirname */
require('webpack');
const path = require('path');
console.log(__dirname);
const buildPath = path.resolve(__dirname, '../../../public/bundles/');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;


/**
 * Base configuration object for Webpack
 */
const config = {
    entry: [
        './src/main.ts', // Angular entrypoint
        './src/app.module.ajs.ts', // AJS entrypoint
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
                use: ['style-loader', 'css-loader', 'less-loader'],
            },
            {
                test: /\.(scss)$/,
                use: [{
                    loader: 'style-loader', // inject CSS to page
                }, {
                    loader: 'css-loader', // translates CSS into CommonJS modules
                }, {
                    loader: 'postcss-loader', // Run post css actions
                    options: {
                        plugins: function () { // post css plugins, can be exported to postcss.config.js
                            return [
                                require('precss'),
                                require('autoprefixer')
                            ];
                        }
                    }
                }, {
                    loader: 'sass-loader' // compiles Sass to CSS
                }]
            },
            {
                test: /\.ts$/,
                loader: ['ng-annotate-loader', 'awesome-typescript-loader', 'tslint-loader'],
            },
            {
                test: /\.js$/,
                use: ['babel-loader'],
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
                test: /\.component\.html$/,
                use: 'raw-loader'
            },
            {
                test: /\.template.html$/,
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
        new webpack.ContextReplacementPlugin(/\@angular(\\|\/)core(\\|\/)fesm5/, path.join(__dirname, './src')),
        new CleanWebpackPlugin(['bundles'], { root: path.resolve(__dirname, '../../../public') }),
        new HtmlWebpackPlugin({ title: 'Production' }),
        new BundleAnalyzerPlugin({ analyzerMode: 'static', openAnalyzer: false })
    ],
    resolve: {
        alias: { Images: path.resolve(__dirname, '../src/assets/images') },
        extensions: ['.ts', '.js', '.json', '.css', '.html']
    }
};

module.exports = config;
