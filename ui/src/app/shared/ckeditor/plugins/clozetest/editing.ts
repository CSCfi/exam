// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Plugin, ViewElement } from 'ckeditor5';
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
        // Conversion from view elements to model attributes
        this.upcast('case-sensitive', 'ctCaseSensitive');
        this.upcast('numeric', 'ctNumeric');
        this.upcast('precision', 'ctPrecision');
        this.upcast('id', 'ctId');
        this.upcast('cloze', 'ctCloze');
        this.upcast('class', 'ctClass');
        // Conversions from model attributes to view elements
        this.downcast('ctCaseSensitive', 'case-sensitive');
        this.downcast('ctNumeric', 'numeric');
        this.downcast('ctPrecision', 'precision');
        this.downcast('ctId', 'id');
        this.downcast('ctCloze', 'cloze');
        this.downcast('ctClass', 'class');
    }

    private upcast = (attrName: string, model: string) =>
        this.editor.conversion.for('upcast').elementToAttribute({
            view: { name: 'span', attributes: { [attrName]: true } },
            model: { key: model, value: (element: ViewElement) => element.getAttribute(attrName) },
        });

    private downcast = (model: string, attrName: string) =>
        this.editor.conversion.for('downcast').attributeToElement({
            model: model,
            view: (attr, api) => api.writer.createAttributeElement('span', { [attrName]: attr }),
        });
}
