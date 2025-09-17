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
                // Get expression from text content first, then fallback to data-expression attribute
                const firstChild = viewElement.getChild(0);
                const textContent = firstChild && 'data' in firstChild ? (firstChild as { data: string }).data : '';
                const dataExpression = viewElement.getAttribute('data-expression') || '';
                const expression = textContent.trim() || dataExpression;

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

        // Convert from model to view (editing view) - use createContainerElement with toWidget for proper selection support
        conversion.for('editingDowncast').elementToElement({
            model: 'mathField',
            view: (modelElement, { writer }) => {
                const expression = (modelElement.getAttribute('mathExpression') || '') as string;

                // Create container element that can be converted to widget
                const mathElement = writer.createContainerElement('math-field', {
                    'read-only': 'true',
                    'math-virtual-keyboard-policy': 'off',
                    style: 'display: inline-block; border: none; outline: none; background: transparent; cursor: pointer; padding: 2px; border-radius: 3px; transition: background-color 0.2s; pointer-events: all; user-select: none; -webkit-user-select: none;',
                    class: 'math-element-selectable ck-widget__editable',
                    'data-math-expression': expression,
                    'data-math-initialized': 'false',
                    'data-math-timestamp': Date.now().toString(), // Add timestamp to force re-processing
                    contenteditable: 'false',
                });

                // Insert the expression as text content
                writer.insert(writer.createPositionAt(mathElement, 0), writer.createText(expression));

                // Convert to widget for proper CKEditor selection support
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
    }

    private async initializeMathField(element: HTMLElement, expression: string) {
        try {
            // Load MathLive dynamically
            await import('mathlive');

            if (typeof window !== 'undefined' && window.MathfieldElement) {
                // The element is already a math-field, just configure it
                const mathField = element as HTMLElement & {
                    value: string;
                    readOnly: boolean;
                    setAttribute: (name: string, value: string) => void;
                };

                // Use the expression passed in (from text content)
                mathField.value = expression;
                mathField.readOnly = true;
                mathField.setAttribute('math-virtual-keyboard-policy', 'off');
            } else {
                console.warn('MathfieldElement not available, showing LaTeX');
                // Keep the LaTeX as text content if MathLive is not available
                element.textContent = expression;
            }
        } catch (error) {
            console.error('Failed to initialize math-field element:', error);
            // Keep the LaTeX as text content on error
            element.textContent = expression;
        }
    }
}
