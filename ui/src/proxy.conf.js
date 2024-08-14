// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

const PROXY_CONFIG = {
    '/app/**': {
        target: 'http://localhost:9000',
        secure: false,
        logLevel: 'debug',
        bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf('html') !== -1) {
                console.log('Skipping proxy for browser request.');
                return '/index.html';
            }
        },
    },
};

module.exports = PROXY_CONFIG;
