// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

// Had to setup our own translation infrastructure like this because
// the preferred .po files aren't caught up by CKE's translation engine.
// Probably because there is no loader for those in Angular so they aren't
// bundled.
const dictionary: Record<string, string> = {
    'Cloze Test': 'Lucktest',
    Answer: 'Rätt svar',
    'Case Sensitive': 'Är det skillnad mellan stor och liten bokstav (gäller endast svar i textform)',
    Numeric: 'Numeriskt svar',
    Precision: 'Krav på svarets precision (± av värdet på det korrekta svaret)',
    Save: 'Spara',
    Cancel: 'Avbryt',
};
export default dictionary;
