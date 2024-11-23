// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

// Had to setup our own translation infrastructure like this because
// the preferred .po files aren't caught up by CKE's translation engine.
// Probably because there is no loader for those in Angular so they aren't
// bundled.
const dictionary: Record<string, string> = {
    'Cloze Test': 'Embedded Answer',
    Answer: 'Correct Answer',
    'Case Sensitive': 'Case sensitive (textual answer only)',
    Numeric: 'Numeric Answer',
    Precision: 'Required answer precision (± of correct numeric answer value)',
    Save: 'Save',
    Cancel: 'Cancel',
};
export default dictionary;
