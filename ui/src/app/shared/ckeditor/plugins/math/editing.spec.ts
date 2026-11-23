// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ClassicEditor, Essentials, Paragraph } from 'ckeditor5';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { MathEditing } from './editing';

/** Formulas are saved as <math-field>LaTeX</math-field>; what goes in has to come out unchanged */
describe('MathEditing', () => {
    let editor: ClassicEditor | undefined;

    beforeAll(() => {
        (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    });

    afterEach(async () => {
        await editor?.destroy();
        editor = undefined;
        document.body.innerHTML = '';
    });

    const create = async (data = '') => {
        const element = document.createElement('div');
        document.body.appendChild(element);
        editor = await ClassicEditor.create(element, {
            licenseKey: 'GPL',
            plugins: [Essentials, Paragraph, MathEditing],
            toolbar: [],
        });
        editor.setData(data);
        return editor;
    };

    // Spaces next to an inline element are saved as &nbsp;, which CKEditor does for every inline object
    const text = (html: string) => html.replace(/&nbsp;/g, ' ');

    const formulas = (html: string) =>
        Array.from(new DOMParser().parseFromString(html, 'text/html').querySelectorAll('math-field')).map(
            (m) => m.textContent,
        );

    describe('saved content', () => {
        it('should keep a formula and the text around it', async () => {
            const e = await create('<p>Solve <math-field>x^2 + \\frac{1}{2} = 0</math-field> for x.</p>');
            expect(formulas(e.getData())).toEqual(['x^2 + \\frac{1}{2} = 0']);
            expect(text(e.getData())).toMatch(/^<p>Solve <math-field>.*<\/math-field> for x\.<\/p>$/);
        });

        it('should take the expression from data-math-expression over the text, which MathLive may have changed', async () => {
            const e = await create('<p><math-field data-math-expression="x^2">x²</math-field></p>');
            expect(formulas(e.getData())).toEqual(['x^2']);
        });

        it('should turn the older span[xmmath] format into a formula', async () => {
            const e = await create('<p>Area <span xmmath="\\pi r^2"></span></p>');
            expect(formulas(e.getData())).toEqual(['\\pi r^2']);
            expect(e.getData()).not.toContain('xmmath');
        });

        it('should keep several formulas in their order', async () => {
            const e = await create('<p><math-field>a</math-field> and <math-field>b</math-field></p>');
            expect(formulas(e.getData())).toEqual(['a', 'b']);
        });

        it('should save nothing but the expression', async () => {
            const e = await create('<p><math-field>y</math-field></p>');
            // The editing view's widget attributes stay out of the saved content
            expect(e.getData()).toBe('<p><math-field>y</math-field></p>');
        });
    });

    describe('the insert math command', () => {
        it('should insert a formula where the cursor is', async () => {
            const e = await create('<p>Result: </p>');
            e.model.change((w) => w.setSelection(e.model.document.getRoot()!.getChild(0)!, 'end'));
            e.execute('insertMath', { expression: '\\sqrt{2}', renderer: 'mathlive' });
            expect(formulas(e.getData())).toEqual(['\\sqrt{2}']);
        });

        it('should show and change the selected formula in place', async () => {
            const e = await create('<p>a <math-field>x</math-field> b</p>');
            const formula = (
                e.model.document.getRoot()!.getChild(0) as unknown as { getChild(i: number): never }
            ).getChild(1);
            e.model.change((w) => w.setSelection(formula, 'on'));

            expect(e.commands.get('insertMath')!.value).toEqual({ expression: 'x', renderer: 'mathlive' });
            e.execute('insertMath', { expression: 'y', renderer: 'mathlive' });

            expect(text(e.getData())).toBe('<p>a <math-field>y</math-field> b</p>');
        });
    });
});
