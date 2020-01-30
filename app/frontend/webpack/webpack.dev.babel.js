import webpack from 'webpack';
import merge from 'webpack-merge';

import common from './webpack.common.babel';

module.exports = merge(common, {
    devtool: 'eval-source-map',
    mode: 'development',
    output: {
        filename: 'app.bundle.js',
        sourceMapFilename: 'app.bundle.map',
    },
    optimization: {},
    plugins: [new webpack.HotModuleReplacementPlugin()],
});
