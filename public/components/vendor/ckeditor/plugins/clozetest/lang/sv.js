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

CKEDITOR.plugins.setLang('clozetest', 'sv',
    {
        toolbar: {
            label: 'Lucktest'
        },
        contextMenu: {
            label: 'Editera lucktest'
        },
        dialog: {
            title: 'Lucktestets egenskaper',
            answer: 'Rätt svar',
            errors: {
                nonEmpty: 'Svarsfältet kan inte lämnas tomt.',
                numeric: 'Svaret måste ha ett numeriskt värde och får inte innehålla mellanslag.',
                nonNegative: 'Värdet kan inte vara under 0.'
            },
            caseSensitive: 'Är det skillnad mellan stor och liten bokstav (gäller endast svar i textform).',
            options: {
                yes: 'Ja',
                no: 'Nej'
            },
            numeric: 'Numeriskt svar',
            precision: 'Krav på svarets precision (&plusmn; av värdet på det korrekta svaret)',
            usage: {
                title: 'Användning',
                part1: 'Använd vertikalt steck ( | ) för att skilja korrekta svar från varandra. Använd asterisk ( * ) om vilken som helst serie av tecken duger. Till exempel ',
                part2: 'betyder att  "skepp", "flaggskepp", "båt" och "färja" skulle duga som korrekta svar. Om du vill att svaret de facto innehåller antingen en asterisk eller ett vertikalt streck så bör ett sådant tecken föregås av enkel apostrof:',
                example1: '*skepp|båt|färja'
            },

        }

    });
