import CleanWebpackPlugin from 'clean-webpack-plugin';
import ForkTsCheckerNotifierWebpackPlugin from 'fork-ts-checker-notifier-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import path from 'path';
import { ProvidePlugin } from 'webpack';

const buildPath = path.resolve(__dirname, '../../../public/bundles/');
/**
 * Base configuration object for Webpack
 */
const config = {
    entry: ['./src/app.module.ts'],
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
                test: /\.scss$/,
                use: ['style-loader', 'css-loader', 'sass-loader'],
            },
            {
                test: /\.ts$/,
                use: [{ loader: 'ng-annotate-loader' }, { loader: 'ts-loader', options: { transpileOnly: true } }],
            },
            {
                test: /\.js$/,
                use: ['babel-loader'],
                exclude: /node_modules/,
            },
            {
                test: /\.(jpg|png|svg)$/,
                use: 'url-loader?limit=100000',
            },
            {
                test: /\.html$/,
                use: 'ng-cache-loader?prefix=[dir]/[dir]',
                exclude: '/node_modules/',
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
        new ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery',
        }),
        new CleanWebpackPlugin(['bundles'], { root: path.resolve(__dirname, '../../../public') }),
    ],
    resolve: {
        alias: { Images: path.resolve(__dirname, '../src/assets/images') },
        extensions: ['.ts', '.js', '.json', '.css', '.html'],
    },
};

export default config;
