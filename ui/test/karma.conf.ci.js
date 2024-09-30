// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

module.exports = function(config) {
    const common = require('./karma.conf.js');
    common(config);
    config.set({
        singleRun: true,
        autoWatch: false,
        browsers: ['PhantomJS'],
    });
};
