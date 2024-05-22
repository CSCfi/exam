// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

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
