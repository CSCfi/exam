/* global __dirname */
const path = require('path');
const buildPath = path.resolve(__dirname, '../../../public/bundles/');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

/**
 * Base configuration object for Webpack
 */
const config = {
    entry: [
        './src/main.ts', // Angular entrypoint
    ],
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
                test: /\.less$/,
                use: ['style-loader', 'css-loader', 'less-loader'],
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
                        loader: 'postcss-loader', // Run post css actions
                        options: {
                            plugins: function() {
                                // post css plugins, can be exported to postcss.config.js
                                return [require('precss'), require('autoprefixer')];
                            },
                        },
                    },
                    {
                        loader: 'sass-loader', // compiles Sass to CSS
                    },
                ],
            },
            {
                test: /\.ts$/,
                use: [{ loader: 'ts-loader', options: { transpileOnly: true } }],
            },
            {
                // Mark files inside `@angular/core` as using SystemJS style dynamic imports.
                // Removing this will cause deprecation warnings to appear.
                test: /[\/\\]@angular[\/\\]core[\/\\].+\.js$/,
                parser: { system: true }, // enable SystemJS
            },
            {
                test: /\.(jpg|png|svg)$/,
                use: 'url-loader?limit=100000',
            },
            {
                test: /\.component\.html$/,
                use: 'raw-loader',
            },
            {
                test: /\.(woff|woff2|ttf|eof|eot)$/,
                use: 'url-loader',
            },
        ],
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({
            eslint: true,
        }),
        new ForkTsCheckerNotifierWebpackPlugin({ title: 'TypeScript', excludeWarnings: false }),
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery',
        }),
        new webpack.ContextReplacementPlugin(/\@angular(\\|\/)core(\\|\/)fesm5/, path.join(__dirname, './src')),
        new CleanWebpackPlugin(['bundles'], { root: path.resolve(__dirname, '../../../public') }),
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new BundleAnalyzerPlugin({ analyzerMode: 'static', openAnalyzer: false }),
    ],
    resolve: {
        alias: { Images: path.resolve(__dirname, '../src/assets/images') },
        extensions: ['.ts', '.js', '.json', '.css', '.html'],
    },
};

module.exports = config;
