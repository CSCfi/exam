// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

CKEDITOR.plugins.setLang('clozetest', 'fi',
    {
        toolbar: {
            label: 'Aukkotehtävä'
        },
        contextMenu: {
            label: 'Muokkaa aukkotehtävää'
        },
        dialog: {
            title: 'Aukkotehtävän tiedot',
            answer: 'Oikea vastaus',
            errors: {
                nonEmpty: 'Vastaus ei voi olla tyhjä.',
                numeric: 'Vastauksen pitää olla numeerinen, eikä se saa sisältää tyhjää tilaa.',
                nonNegative: 'Arvo ei voi olla negatiivinen'
            },
            caseSensitive: 'Onko pienillä ja isoilla kirjaimilla eroa (tekstimuotoisen vastauksen osalta)',
            options: {
                yes: 'Kyllä',
                no: 'Ei'
            },
            numeric: 'Numeerinen vastaus',
            precision: 'Vaadittu tarkkuus (&plusmn; oikean vastauksen arvosta)',
            usage: {
                title: 'Käyttö',
                part1: 'Käytä pystyviivaa ( | ) erottamaan oikeat vastausvaihtoehdot toisistaan. Käytä tähteä ( * ) wildcardina, jos mikä tahansa merkki käy. Esimerkiksi',
                part2: 'tarkoittaa, että vaikkapa "laiva", "lippulaiva", "vene" ja "lautta" olisivat oikeita vastauksia. ' +
                'Jos haluat, että vastaus sisältää oikeasti pystyviivan tai tähden, pitää tällaista merkkiä edeltää kenoviiva:',
                example1: '*laiva|vene|lautta'
            },

        }

    });
