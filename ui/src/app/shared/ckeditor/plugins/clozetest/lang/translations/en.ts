// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Dictionary } from './model';

// Had to setup our own translation infrastructure like this because
// the preferred .po files aren't caught up by CKE's translation engine.
// Probably because there is no loader for those in Angular so they aren't
// bundled.
const dictionary: Dictionary = {
    toolbarLabel: 'Embedded Answer',
    answerLabel: 'Correct Answer',
    caseSensitiveLabel: 'Case sensitive',
    caseSensitiveTip: 'Case sensitivity (textual answer only)',
    numericLabel: 'Numeric Answer',
    numericError: 'Answer must be a numeric value',
    precisionLabel: 'Required answer precision',
    precisionTip: '(± of correct numeric answer value)',
    save: 'Save',
    cancel: 'Cancel',
};
export default dictionary;
