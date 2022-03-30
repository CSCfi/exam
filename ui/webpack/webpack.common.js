/* global __dirname */
const path = require('path');
const buildPath = path.resolve(__dirname, '../../public/bundles/');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

/**
 * Base configuration object for Webpack
 */
const config = {
    entry: ['./src/polyfills.ts'],
    optimization: {
        usedExports: true,
    },
    output: {
        path: buildPath,
        publicPath: '/bundles/',
    },
    externals: {},
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(scss)$/,
                use: [
                    {
                        loader: 'style-loader', // inject CSS to page
                    },
                    {
                        loader: 'css-loader', // translates CSS into CommonJS modules
                    },
                    {
                        loader: 'sass-loader', // compiles Sass to CSS
                    },
                ],
            },
            {
                test: /\.(png|svg)$/,
                type: 'asset/resource',
            },
            {
                test: /\.html$/,
                type: 'asset/source',
            },
            {
                test: /\.(woff|woff2)$/,
                use: ['url-loader'],
            },
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false,
                },
            },
        ],
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({ eslint: { files: './src/**/*.ts' } }),
        new CleanWebpackPlugin(),
        new webpack.IgnorePlugin({
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/,
        }),
        new BundleAnalyzerPlugin({ analyzerMode: 'static', openAnalyzer: false }),
    ],
    resolve: {
        extensions: ['.ts', '.js'],
        //fallback: { buffer: require.resolve('buffer/') },
        mainFields: ['es2015', 'main'],
    },
};

module.exports = config;
