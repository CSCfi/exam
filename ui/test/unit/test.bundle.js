// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

require('angular');
require('angular-ui-bootstrap');
require('jasmine-jquery');
require('angular-mocks');
require('angular-resource');
require('../../src/app.module');
const context = require.context('.', true, /Spec\.js$/);

/*
 * For each file, call the context function that will require the file and load it up here.
 */
context.keys().forEach(context);
