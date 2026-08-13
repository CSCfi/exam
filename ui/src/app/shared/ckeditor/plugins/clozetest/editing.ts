// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Plugin } from 'ckeditor5';
import { ClozeCommand } from './command';

export class ClozeEditing extends Plugin {
    init() {
        this.defineSchema();
        this.defineConverters();
        this.editor.commands.add('addCloze', new ClozeCommand(this.editor));
    }

    private defineSchema() {
        const schema = this.editor.model.schema;

        schema.extend('$text', {
            allowAttributes: ['ctCaseSensitive', 'ctNumeric', 'ctPrecision', 'ctId', 'ctCloze', 'ctClass'],
        });
    }

    private defineConverters() {
        const conversion = this.editor.conversion;

        // Upcast: Convert view <span> with cloze attribute to model text with attributes
        conversion.for('upcast').add((dispatcher) => {
            dispatcher.on(
                'element:span',
                (evt, data, conversionApi) => {
                    const viewItem = data.viewItem;

                    // Only process spans with cloze attribute
                    if (!viewItem.hasAttribute('cloze')) {
                        return;
                    }

                    // Prevent other converters from processing this element
                    evt.stop();

                    // Get all the cloze attributes
                    const caseSensitiveStr = viewItem.getAttribute('case-sensitive');
                    const numericStr = viewItem.getAttribute('numeric');
                    const precision = viewItem.getAttribute('precision');
                    const id = viewItem.getAttribute('id');
                    const cloze = viewItem.getAttribute('cloze');
                    const classAttr = viewItem.getAttribute('class');

                    // Convert string booleans to actual booleans
                    const caseSensitive = caseSensitiveStr === 'true' || caseSensitiveStr === true;
                    const numeric = numericStr === 'true' || numericStr === true;

                    // Convert the children (text content)
                    const text = conversionApi.convertChildren(viewItem, data.modelCursor);

                    // Set attributes on the converted text
                    if (text && text.modelRange) {
                        const writer = conversionApi.writer;
                        writer.setAttribute('ctCloze', cloze, text.modelRange);
                        writer.setAttribute('ctCaseSensitive', caseSensitive, text.modelRange);
                        writer.setAttribute('ctNumeric', numeric, text.modelRange);
                        if (precision !== undefined) writer.setAttribute('ctPrecision', precision, text.modelRange);
                        if (id !== undefined) writer.setAttribute('ctId', id, text.modelRange);
                        if (classAttr !== undefined) writer.setAttribute('ctClass', classAttr, text.modelRange);

                        // Update the conversion result
                        data.modelRange = text.modelRange;
                        data.modelCursor = text.modelCursor;
                    }
                },
                { priority: 'highest' },
            );
        });

        // Downcast: Convert model attributes to view elements
        conversion.for('downcast').attributeToElement({
            model: {
                key: 'ctCloze',
                name: '$text',
            },
            view: (attributeValue, { writer }, { item }) => {
                // Get all cloze-related attributes from the text node
                const attrs: Record<string, string | boolean> = {
                    cloze: String(attributeValue),
                };

                if (item.hasAttribute('ctClass')) attrs['class'] = String(item.getAttribute('ctClass'));
                if (item.hasAttribute('ctId')) attrs.id = String(item.getAttribute('ctId'));
                if (item.hasAttribute('ctPrecision')) attrs.precision = String(item.getAttribute('ctPrecision'));
                if (item.hasAttribute('ctCaseSensitive'))
                    attrs['case-sensitive'] = String(item.getAttribute('ctCaseSensitive'));
                if (item.hasAttribute('ctNumeric')) attrs.numeric = String(item.getAttribute('ctNumeric'));

                return writer.createAttributeElement('span', attrs);
            },
        });
    }
}
