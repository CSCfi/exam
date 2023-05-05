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

CKEDITOR.plugins.setLang('clozetest', 'en',
    {
        toolbar: {
            label: 'Embedded Answer'
        },
        contextMenu: {
            label: 'Edit embedded answer'
        },
        dialog: {
            title: 'Embedded Answer Properties',
            answer: 'Correct Answer',
            errors: {
                nonEmpty: 'Answer field cannot be empty.',
                numeric: 'Answer must be a numeric value and it cannot contain any whitespace.',
                nonNegative: 'Value must be a non negative number.'
            },
            caseSensitive: 'Case sensitive (textual answer only)',
            options: {
                yes: 'Yes',
                no: 'No'
            },
            numeric: 'Numeric Answer',
            precision: 'Required answer precision (&plusmn; of correct numeric answer value)',
            usage: {
                title: 'Usage',
                part1: 'Use vertical bar ( | ) to separate correct answer options from each other. Use asterisk ( * ) as a wildcard to match any series of characters. For example',
                part2: 'would match answers "ship", "flagship", "boat" and "ferry". If you really do want to match an asterisk or a vertical pipe then use a backslash like this:',
                example1: '*ship|boat|ferry'
            },

        }

    });
