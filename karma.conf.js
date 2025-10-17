// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

// Karma configuration for Angular 20+

module.exports = function (config) {
    const isCI = process.env.CI === 'true';

    config.set({
        basePath: '',
        frameworks: ['jasmine'],
        plugins: [require('karma-jasmine'), require('karma-chrome-launcher')],
        client: {
            jasmine: {
                random: false,
            },
            clearContext: false,
        },
        reporters: ['progress'],
        port: 9876,
        colors: true,
        logLevel: isCI ? config.LOG_ERROR : config.LOG_INFO,
        autoWatch: !isCI,
        browsers: ['ChromeHeadlessCI'],
        singleRun: isCI,
        restartOnFileChange: !isCI,

        // Timeouts
        captureTimeout: 120000,
        browserDisconnectTolerance: 2,
        browserDisconnectTimeout: 60000,
        browserNoActivityTimeout: 60000,

        customLaunchers: {
            ChromeHeadlessCI: {
                base: 'ChromeHeadless',
                flags: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-gpu',
                    '--disable-dev-shm-usage',
                    '--disable-software-rasterizer',
                    '--disable-extensions',
                ],
            },
        },
    });
};

