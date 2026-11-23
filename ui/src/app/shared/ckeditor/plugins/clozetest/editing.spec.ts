// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ClassicEditor, Essentials, Paragraph } from 'ckeditor5';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ClozeEditing } from './editing';

/**
 * The backend finds the blanks with span[cloze=true] and keys the answers by the span's id
 * (ClozeTestAnswer.scala), so whatever the editor saves has to keep those exactly.
 */
describe('ClozeEditing', () => {
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
            plugins: [Essentials, Paragraph, ClozeEditing],
            toolbar: [],
        });
        editor.setData(data);
        return editor;
    };

    /** The saved blank's attributes, as the backend would read them */
    const blanks = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return Array.from(doc.querySelectorAll('span[cloze="true"]')).map((b) => ({
            text: b.textContent,
            id: b.getAttribute('id'),
            caseSensitive: b.getAttribute('case-sensitive'),
            numeric: b.getAttribute('numeric'),
            precision: b.getAttribute('precision'),
            className: b.getAttribute('class'),
        }));
    };

    describe('saved question text', () => {
        it('should keep a blank with its answer and settings through the editor', async () => {
            const e = await create(
                '<p>The capital is <span cloze="true" id="$ab12" case-sensitive="true" numeric="false" ' +
                    'precision="0" class="cloze-test-wrapper">Helsinki</span>.</p>',
            );
            expect(blanks(e.getData())).toEqual([
                {
                    text: 'Helsinki',
                    id: '$ab12',
                    caseSensitive: 'true',
                    numeric: 'false',
                    precision: '0',
                    className: 'cloze-test-wrapper',
                },
            ]);
            expect(e.getData()).toContain('The capital is ');
        });

        it('should keep a numeric blank and its precision', async () => {
            const e = await create('<p><span cloze="true" id="$n1" numeric="true" precision="0.5">3.14</span></p>');
            expect(blanks(e.getData())[0]).toMatchObject({ text: '3.14', numeric: 'true', precision: '0.5' });
        });

        it('should treat missing settings as not case sensitive and not numeric', async () => {
            const e = await create('<p><span cloze="true" id="$x1">answer</span></p>');
            expect(blanks(e.getData())[0]).toMatchObject({ caseSensitive: 'false', numeric: 'false' });
        });

        it('should keep several blanks apart, each with its own id', async () => {
            const e = await create(
                '<p><span cloze="true" id="$a1">one</span> and <span cloze="true" id="$b2">two</span></p>',
            );
            expect(blanks(e.getData()).map((b) => [b.id, b.text])).toEqual([
                ['$a1', 'one'],
                ['$b2', 'two'],
            ]);
        });

        it('should leave an ordinary span alone', async () => {
            const e = await create('<p>plain <span class="other">text</span></p>');
            expect(blanks(e.getData())).toEqual([]);
            expect(e.getData()).toContain('text');
        });
    });

    describe('the add cloze command', () => {
        it('should insert a new blank with a fresh id, and leave the cursor after it', async () => {
            const e = await create('<p>Answer: </p>');
            e.model.change((w) => w.setSelection(e.model.document.getRoot()!.getChild(0)!, 'end'));

            e.execute('addCloze', { text: ' 42 ', caseSensitive: false, numeric: true, precision: 1 });

            const [blank] = blanks(e.getData());
            expect(blank).toMatchObject({
                text: '42',
                caseSensitive: 'false',
                numeric: 'true',
                precision: '1',
                className: 'cloze-test-wrapper',
            });
            expect(blank.id).toMatch(/^\$[0-9a-z]{1,4}$/);
            // A space after the blank so that typing goes on outside it
            expect(e.getData()).toMatch(/<\/span>(&nbsp;| )<\/p>$/);
        });

        it('should show the settings of the blank the cursor is in', async () => {
            const e = await create(
                '<p><span cloze="true" id="$k1" case-sensitive="true" precision="2">word</span></p>',
            );
            const paragraph = e.model.document.getRoot()!.getChild(0)!;
            e.model.change((w) => w.setSelection(paragraph, 2));

            const value = e.commands.get('addCloze')!.value as { text: string; caseSensitive: boolean };
            expect(value).toMatchObject({ text: 'word', caseSensitive: true, precision: '2' });
        });

        it('should change a blank in place, keeping its id', async () => {
            const e = await create('<p>x <span cloze="true" id="$k1" case-sensitive="false">old</span> y</p>');
            const paragraph = e.model.document.getRoot()!.getChild(0)!;
            e.model.change((w) => w.setSelection(paragraph, 3));

            e.execute('addCloze', { text: 'new', caseSensitive: true, numeric: false, precision: 0 });

            expect(blanks(e.getData())).toEqual([
                {
                    text: 'new',
                    id: '$k1',
                    caseSensitive: 'true',
                    numeric: 'false',
                    precision: '0',
                    className: 'cloze-test-wrapper',
                },
            ]);
            expect(e.getData()).toMatch(/^<p>x <span[^>]*>new<\/span> y<\/p>$/);
        });
    });
});
