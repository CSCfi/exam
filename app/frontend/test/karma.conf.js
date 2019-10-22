/*
 * Copyright (c) 2018 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */
const webpackConf = require('../webpack/webpack.dev');

module.exports = function(config) {
    config.set({
        basePath: '',
        files: [
            'unit/test.bundle.js',
            { pattern: 'unit/fixtures/**/*.json', watched: true, served: true, included: false },
        ],
        singleRun: false,
        autoWatch: true,
        frameworks: ['jasmine'],
        browsers: ['Chrome'],
        plugins: [
            'karma-chrome-launcher',
            'karma-phantomjs-launcher',
            'karma-sourcemap-loader',
            'karma-jasmine',
            'karma-webpack',
        ],
        reporters: ['dots'],
        logLevel: config.LOG_INFO,
        preprocessors: {
            'unit/test.bundle.js': ['webpack', 'sourcemap'],
        },
        webpack: webpackConf,
        webpackMiddleware: {
            stats: 'errors-only',
        },
    });
};
