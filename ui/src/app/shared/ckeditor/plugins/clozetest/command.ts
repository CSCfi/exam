// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Command, findAttributeRange, ModelRange } from 'ckeditor5';
import { CommandValue } from './ui';
import { getRangeText } from './utils';

export class ClozeCommand extends Command {
    private isEditing = false;

    override refresh(): void {
        const model = this.editor.model;
        const selection = model.document.selection;
        const firstRange = selection.getFirstRange()!;
        if (selection.hasAttribute('ctCaseSensitive')) {
            const caseSensitiveValue = selection.getAttribute('ctCaseSensitive');
            const precisionValue = selection.getAttribute('ctPrecision');
            const numericValue = selection.getAttribute('ctNumeric');
            const answerRange = findAttributeRange(
                selection.getFirstPosition()!,
                'ctCaseSensitive',
                caseSensitiveValue,
                model,
            );
            if (firstRange.isCollapsed) {
                this.setValue(caseSensitiveValue, precisionValue, numericValue, answerRange);
            } else if (answerRange.containsRange(firstRange, true)) {
                this.setValue(caseSensitiveValue, precisionValue, numericValue, firstRange);
            } else if (!this.isEditing) {
                // Only clear value if we're not in the middle of editing
                this.value = null;
            }
        } else if (!this.isEditing) {
            // Only clear value if we're not in the middle of editing
            this.value = null;
        }

        this.isEnabled =
            model.schema.checkAttributeInSelection(selection, 'ctCaseSensitive') &&
            model.schema.checkAttributeInSelection(selection, 'ctPrecision');
    }

    startEditing() {
        this.isEditing = true;
    }

    stopEditing() {
        this.isEditing = false;
    }

    override execute({ text, caseSensitive, numeric, precision }: CommandValue) {
        const model = this.editor.model;

        // Reset editing flag after execution
        this.isEditing = false;

        model.change((writer) => {
            // Check if we're editing an existing cloze element
            const currentValue = this.value as CommandValue | null;
            if (currentValue && currentValue.range) {
                // Update existing cloze element
                const range = currentValue.range;
                const trimmedText = text.trim();

                // Get the existing ID from the range
                let existingId = this.createUid();
                for (const item of range.getItems()) {
                    if (item.is('$textProxy') && item.hasAttribute('ctId')) {
                        existingId = item.getAttribute('ctId') as string;
                        break;
                    }
                }

                // Remove old text and insert new text with updated attributes
                writer.remove(range);
                const insertPosition = range.start;
                model.insertContent(
                    writer.createText(trimmedText, {
                        ctCaseSensitive: caseSensitive,
                        ctPrecision: precision || 0,
                        ctNumeric: numeric,
                        ctId: existingId,
                        ctClass: 'cloze-test-wrapper',
                        ctCloze: true,
                    }),
                    insertPosition,
                );
            } else {
                // Insert new cloze element
                model.insertContent(
                    writer.createText(text.trim(), {
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
            }
        });
    }
    private setValue = (caseSensitive: unknown, precision: unknown, numeric: unknown, range: ModelRange) =>
        (this.value = {
            text: getRangeText(range),
            caseSensitive: caseSensitive,
            precision: precision,
            numeric: numeric,
            range: range,
        });

    private createUid = () => `$${((Math.random() * Math.pow(36, 4)) << 0).toString(36).slice(-4)}`;
}
