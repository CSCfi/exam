// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

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
