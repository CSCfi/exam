// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Plugin, ViewElement, toWidget } from 'ckeditor5';
import { MathCommand } from './command';

export class MathEditing extends Plugin {
    init() {
        this.defineSchema();
        this.defineConverters();
        this.editor.commands.add('insertMath', new MathCommand(this.editor));
    }

    private defineSchema() {
        const schema = this.editor.model.schema;

        // Define math element
        schema.register('mathField', {
            inheritAllFrom: '$inlineObject',
            allowAttributes: ['mathExpression', 'mathRenderer'],
        });
    }

    private defineConverters() {
        const conversion = this.editor.conversion;

        // Convert from view to model - handle math-field elements
        conversion.for('upcast').elementToElement({
            view: 'math-field',
            model: (viewElement: ViewElement, { writer }) => {
                // Prefer data-math-expression attribute (authoritative, not modified by MathLive)
                // Fall back to text content for legacy data that lacks the attribute
                const dataExpression = viewElement.getAttribute('data-math-expression') || '';
                const firstChild = viewElement.getChild(0);
                const textContent = firstChild && 'data' in firstChild ? (firstChild as { data: string }).data : '';
                const expression = dataExpression || textContent.trim();

                return writer.createElement('mathField', {
                    mathExpression: expression,
                    mathRenderer: 'mathlive',
                });
            },
        });

        // Also support legacy span[xmmath] format for backwards compatibility
        conversion.for('upcast').elementToElement({
            view: {
                name: 'span',
                attributes: {
                    xmmath: true,
                },
            },
            model: (viewElement: ViewElement, { writer }) => {
                const expression = viewElement.getAttribute('xmmath') || '';
                return writer.createElement('mathField', {
                    mathExpression: expression,
                    mathRenderer: 'mathlive', // Default to mathlive for new content
                });
            },
        });

        // Convert from model to view (editing view)
        conversion.for('editingDowncast').elementToElement({
            model: 'mathField',
            view: (modelElement, { writer }) => {
                const expression = (modelElement.getAttribute('mathExpression') || '') as string;

                // No light-DOM text child: MathLive renders inside its shadow DOM.
                // Light-DOM text bleeds through the shadow slot and hides the rendered formula.
                // MathLive reads the initial expression from the `value` HTML attribute instead.
                const mathElement = writer.createContainerElement('math-field', {
                    'read-only': 'true',
                    'math-virtual-keyboard-policy': 'off',
                    value: expression,
                    style: 'display: inline-block; border: none; outline: none; background: transparent; cursor: pointer; padding: 2px; border-radius: 3px; transition: background-color 0.2s; pointer-events: all; user-select: none; -webkit-user-select: none;',
                    class: 'math-element-selectable',
                    'data-math-expression': expression,
                    contenteditable: 'false',
                });

                return toWidget(mathElement, writer, { label: `Math formula: ${expression}` });
            },
        });

        // Simple attribute converter for mathExpression changes
        conversion.for('editingDowncast').attributeToAttribute({
            model: 'mathExpression',
            view: 'data-math-expression',
        });

        // Convert from model to view (data view - what gets saved)
        // Save as clean math-field elements with LaTeX as text content
        conversion.for('dataDowncast').elementToElement({
            model: 'mathField',
            view: (modelElement, { writer }) => {
                const expression = (modelElement.getAttribute('mathExpression') || '') as string;

                // Create math-field with LaTeX expression as text content
                const mathFieldElement = writer.createContainerElement('math-field');
                // Insert text at position 0 within the element (correct parameter order)
                writer.insert(writer.createPositionAt(mathFieldElement, 0), writer.createText(expression));
                return mathFieldElement;
            },
        });

        // The upcast and downcast converters above handle copy/paste automatically
        // Math widgets can be selected by clicking on them, and standard Ctrl+C/Ctrl+V will work
    }


}
