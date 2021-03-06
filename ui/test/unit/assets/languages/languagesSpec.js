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
