// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Command } from 'ckeditor5';
import { CommandValue } from './ui';

export class MathCommand extends Command {
    override refresh(): void {
        const model = this.editor.model;
        const selection = model.document.selection;
        const selectedElement = selection.getSelectedElement();

        // Enable the command if we can insert content at the current position
        const parent = selection.focus?.parent;
        this.isEnabled =
            parent && parent.is && parent.is('element') ? model.schema.checkChild(parent, 'mathField') : false;

        // Set value if a math element is currently selected
        if (selectedElement && selectedElement.is('element', 'mathField')) {
            this.value = {
                expression: selectedElement.getAttribute('mathExpression') || '',
                renderer: selectedElement.getAttribute('mathRenderer') || 'mathlive',
            };
        } else {
            this.value = null;
        }
    }

    override execute({ expression, renderer = 'mathlive' }: CommandValue) {
        const model = this.editor.model;
        const selection = model.document.selection;
        const selectedElement = selection.getSelectedElement();

        model.change((writer) => {
            if (selectedElement && selectedElement.is('element', 'mathField')) {
                // Update existing math element
                writer.setAttribute('mathExpression', expression, selectedElement);
                writer.setAttribute('mathRenderer', renderer, selectedElement);
            } else {
                // Create new math element
                const mathElement = writer.createElement('mathField', {
                    mathExpression: expression,
                    mathRenderer: renderer,
                });

                model.insertObject(mathElement);
            }
        });
    }
}
