// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Dictionary } from './model';

// Had to setup our own translation infrastructure like this because
// the preferred .po files aren't caught up by CKE's translation engine.
// Probably because there is no loader for those in Angular so they aren't
// bundled.
const dictionary: Dictionary = {
    toolbarLabel: 'Aukkotehtävä',
    answerLabel: 'Oikea vastaus',
    caseSensitiveLabel: 'Kirjainkoon merkitsevyys',
    caseSensitiveTip: 'Onko pienillä ja isoilla kirjaimilla eroa (tekstimuotoisen vastauksen osalta)',
    numericLabel: 'Numeerinen vastaus',
    numericError: 'Vastauksen pitää olla numeerinen',
    precisionLabel: 'Vaadittu tarkkuus',
    precisionTip: '(± oikean vastauksen arvosta)',
    save: 'Tallenna',
    cancel: 'Peruuta',
    usage: `Käytä pystyviivaa ( | ) erottamaan oikeat vastausvaihtoehdot toisistaan.
            Käytä tähteä ( * ) wildcardina, jos mikä tahansa merkki käy. Esimerkiksi
            '*laiva|vene|lautta' tarkoittaa, että vaikkapa "laiva", "lippulaiva", 
            "vene" ja "lautta" olisivat oikeita vastauksia. Jos haluat, että vastaus 
            sisältää oikeasti pystyviivan tai tähden, pitää tällaista merkkiä edeltää 
            kenoviiva: ( \\ )`,
};
export default dictionary;
