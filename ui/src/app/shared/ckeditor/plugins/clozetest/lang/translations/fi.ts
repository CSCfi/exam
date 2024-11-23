// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

// Had to setup our own translation infrastructure like this because
// the preferred .po files aren't caught up by CKE's translation engine.
// Probably because there is no loader for those in Angular so they aren't
// bundled.
const dictionary: Record<string, string> = {
    'Cloze Test': 'Aukkotehtävä',
    Answer: 'Oikea vastaus',
    'Case Sensitive': 'Onko pienillä ja isoilla kirjaimilla eroa (tekstimuotoisen vastauksen osalta)',
    Numeric: 'Numeerinen vastaus',
    Precision: 'Vaadittu tarkkuus (± oikean vastauksen arvosta)',
    Save: 'Tallenna',
    Cancel: 'Peruuta',
};
export default dictionary;
