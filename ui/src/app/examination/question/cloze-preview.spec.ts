// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { clozePreview } from './cloze-preview';

describe('clozePreview', () => {
    const html =
        '<p>The capital of Finland is <input id="b1" type="text"> and 2 + 3 = <input id="b2" type="number">.</p>';

    it('shows each answered blank in brackets', () => {
        expect(clozePreview(html, { b1: 'Helsinki', b2: '5' })).toBe(
            '<p>The capital of Finland is [Helsinki] and 2 + 3 = [5].</p>',
        );
    });

    it('shows a line for an unanswered or blank-only answer', () => {
        expect(clozePreview(html, { b2: '  ' })).toBe('<p>The capital of Finland is ____ and 2 + 3 = ____.</p>');
    });

    it('escapes what the student typed', () => {
        expect(clozePreview(html, { b1: '<img src=x onerror=alert(1)>' })).toContain(
            '[&lt;img src=x onerror=alert(1)&gt;]',
        );
    });

    it('keeps the rest of the markup, formulas included', () => {
        const withMath = '<p>Solve <math-field>x^2</math-field> = <input id="b1"></p>';
        expect(clozePreview(withMath, {})).toBe('<p>Solve <math-field>x^2</math-field> = ____</p>');
    });

    it('returns nothing for a question without text', () => {
        expect(clozePreview('', {})).toBe('');
    });
});
