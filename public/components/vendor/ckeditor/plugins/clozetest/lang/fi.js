/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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
 */

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
                numeric: 'Vastauksen pitää olla numeerinen',
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
