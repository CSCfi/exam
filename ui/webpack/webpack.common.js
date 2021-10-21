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
                test: /\.ts$/,
                use: [
                    { loader: 'ts-loader', options: { transpileOnly: true, experimentalWatchApi: true } },
                    { loader: 'angular2-template-loader' },
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
        ],
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({ eslint: { files: './src/**/*.ts'} }),
        new CleanWebpackPlugin(),
        new webpack.IgnorePlugin({
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/,
          }),
        new BundleAnalyzerPlugin({ analyzerMode: 'static', openAnalyzer: false }),
    ],
    resolve: {
        extensions: ['.ts', '.js'],
        fallback: { buffer: require.resolve('buffer/') },
    },
};

module.exports = config;
