// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ClassicEditor, Essentials, GeneralHtmlSupport, Paragraph, SourceEditing } from 'ckeditor5';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildHtmlSupportConfig } from './ckeditor.component';

/**
 * What GeneralHtmlSupport lets through decides what a student can make their own browser render
 * during an exam, so these rules are exercised against a real editor rather than asserted on the
 * config object. Everything here goes in through setData(), which is the same data pipeline a
 * paste or a trip through the source editing view goes through.
 */
describe('CKEditor content filtering', () => {
    beforeAll(() => {
        // jsdom has no ResizeObserver, which the CKEditor toolbar renders with.
        (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    });

    const roundTrip = async (allowExternalContent: boolean, data: string) => {
        const element = document.createElement('div');
        document.body.appendChild(element);
        const editor = await ClassicEditor.create(element, {
            licenseKey: 'GPL',
            plugins: [Essentials, Paragraph, GeneralHtmlSupport, SourceEditing],
            toolbar: [],
            htmlSupport: buildHtmlSupportConfig(allowExternalContent),
        });
        editor.setData(data);
        const output = editor.getData();
        await editor.destroy();
        element.remove();
        return output;
    };

    describe('with external content disallowed (student answer editors)', () => {
        it('drops anchors, so there is nothing for Ctrl+click or the browser context menu to open', async () => {
            const output = await roundTrip(false, '<p><a href="https://example.test">text</a></p>');
            expect(output).not.toContain('<a');
            expect(output).toContain('text');
        });

        it('drops elements that fetch and render remote content', async () => {
            const output = await roundTrip(
                false,
                '<p>answer</p><iframe src="https://example.test"></iframe>' +
                    '<video src="https://example.test/v"></video><img src="https://example.test/i" />',
            );
            expect(output).not.toContain('iframe');
            expect(output).not.toContain('video');
            expect(output).not.toContain('img');
            expect(output).toContain('answer');
        });
    });

    describe('with external content allowed (staff editors)', () => {
        it('keeps links', async () => {
            const output = await roundTrip(true, '<p><a href="https://example.test">text</a></p>');
            expect(output).toContain('href="https://example.test"');
        });
    });

    it.each([true, false])('drops scripts and event handlers (allowExternalContent: %s)', async (allowed) => {
        const output = await roundTrip(
            allowed,
            '<p><span onclick="alert(1)">x</span></p><script>alert(1)</script><style>body{}</style>',
        );
        expect(output).not.toContain('onclick');
        expect(output).not.toContain('<script');
        expect(output).not.toContain('<style');
    });
});
