// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

const fi = require('../../../../src/assets/i18n/fi');
const en = require('../../../../src/assets/i18n/en');
const sv = require('../../../../src/assets/i18n/sv');

describe('Language files', function() {
    it('should have same keys', function() {
        const errors = [];
        Object.keys(fi).forEach(k => {
            if (!en.hasOwnProperty(k)) {
                errors.push(`EN: Key=${k}`);
            }
            if (!sv.hasOwnProperty(k)) {
                errors.push(`SV: Key=${k}`);
            }
        });
        expect(errors).toEqual([]);
    });
});
