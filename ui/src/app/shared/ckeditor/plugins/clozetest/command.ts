// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Command, findAttributeRange, Range } from 'ckeditor5';
import { CommandValue } from './ui';
import { getRangeText } from './utils';

export class ClozeCommand extends Command {
    override refresh(): void {
        const model = this.editor.model;
        const selection = model.document.selection;
        const firstRange = selection.getFirstRange()!;
        if (selection.hasAttribute('ctCaseSensitive')) {
            const caseSensitiveValue = selection.getAttribute('ctCaseSensitive');
            const precisionValue = selection.getAttribute('ctPrecision');
            const answerRange = findAttributeRange(
                selection.getFirstPosition()!,
                'ctCaseSensitive',
                caseSensitiveValue,
                model,
            );
            if (firstRange.isCollapsed) {
                this.setValue(caseSensitiveValue, precisionValue, answerRange);
            } else if (answerRange.containsRange(firstRange, true)) {
                this.setValue(caseSensitiveValue, precisionValue, firstRange);
            } else {
                this.value = null;
            }
        } else {
            this.value = null;
        }

        this.isEnabled =
            model.schema.checkAttributeInSelection(selection, 'ctCaseSensitive') &&
            model.schema.checkAttributeInSelection(selection, 'ctPrecision');
    }

    override execute({ text, caseSensitive, numeric, precision }: CommandValue) {
        const model = this.editor.model;
        const hasId = model.document.selection.hasAttribute('ckId');
        console.log(hasId);
        model.change((writer) => {
            model.insertContent(
                writer.createText(text, {
                    ctCaseSensitive: caseSensitive,
                    ctPrecision: precision || 0,
                    ctNumeric: numeric,
                    ctId: this.createUid(),
                    ctClass: 'cloze-test-wrapper',
                    ctCloze: true,
                }),
            );
            // Add a white space so user gets out from plugin context
            writer.insertText(' ', model.document.selection.getFirstPosition()!);
        });
    }
    private setValue = (caseSensitive: unknown, precision: unknown, range: Range) =>
        (this.value = {
            text: getRangeText(range),
            caseSensitive: caseSensitive,
            precision: precision,
            range: range,
        });

    private createUid = () => `$${((Math.random() * Math.pow(36, 4)) << 0).toString(36).slice(-4)}`;
}
