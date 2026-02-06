// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

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
