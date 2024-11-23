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
        const conversion = this.editor.conversion;

        // Conversion from a view element to a model attribute
        conversion.for('upcast').elementToAttribute({
            view: {
                name: 'span',
                attributes: { 'case-sensitive': true },
            },
            model: {
                key: 'ctCaseSensitive',
                value: (viewElement: ViewElement) => viewElement.getAttribute('case-sensitive'),
            },
        });
        conversion.for('upcast').elementToAttribute({
            view: {
                name: 'span',
                attributes: { numeric: true },
            },
            model: {
                key: 'ctNumeric',
                value: (viewElement: ViewElement) => viewElement.getAttribute('numeric'),
            },
        });
        conversion.for('upcast').elementToAttribute({
            view: {
                name: 'span',
                attributes: { precision: true },
            },
            model: {
                key: 'ctPrecision',
                value: (viewElement: ViewElement) => viewElement.getAttribute('precision'),
            },
        });
        conversion.for('upcast').elementToAttribute({
            view: {
                name: 'span',
                attributes: { id: true },
            },
            model: {
                key: 'ctId',
                value: (viewElement: ViewElement) => viewElement.getAttribute('id'),
            },
        });
        conversion.for('upcast').elementToAttribute({
            view: {
                name: 'span',
                attributes: { id: true },
            },
            model: {
                key: 'ctCloze',
                value: (viewElement: ViewElement) => viewElement.getAttribute('cloze'),
            },
        });
        conversion.for('upcast').elementToAttribute({
            view: {
                name: 'span',
                attributes: { id: true },
            },
            model: {
                key: 'ctClass',
                value: (viewElement: ViewElement) => viewElement.getAttribute('class'),
            },
        });
        // Conversion from a model attribute to a view element
        conversion.for('downcast').attributeToElement({
            model: 'ctCaseSensitive',
            view: (modelAttributeValue, conversionApi) => {
                const { writer } = conversionApi;
                return writer.createAttributeElement(
                    'span',
                    { 'case-sensitive': modelAttributeValue },
                    { priority: 5 },
                );
            },
        });
        conversion.for('downcast').attributeToElement({
            model: 'ctNumeric',
            view: (modelAttributeValue, conversionApi) => {
                const { writer } = conversionApi;
                return writer.createAttributeElement('span', { numeric: modelAttributeValue }, { priority: 5 });
            },
        });
        conversion.for('downcast').attributeToElement({
            model: 'ctPrecision',
            view: (modelAttributeValue, conversionApi) => {
                const { writer } = conversionApi;
                return writer.createAttributeElement('span', { precision: modelAttributeValue }, { priority: 5 });
            },
        });
        conversion.for('downcast').attributeToElement({
            model: 'ctId',
            view: (modelAttributeValue, conversionApi) => {
                const { writer } = conversionApi;
                return writer.createAttributeElement('span', { id: modelAttributeValue }, { priority: 5 });
            },
        });
        conversion.for('downcast').attributeToElement({
            model: 'ctCloze',
            view: (modelAttributeValue, conversionApi) => {
                const { writer } = conversionApi;
                return writer.createAttributeElement('span', { cloze: modelAttributeValue }, { priority: 5 });
            },
        });
        conversion.for('downcast').attributeToElement({
            model: 'ctClass',
            view: (modelAttributeValue, conversionApi) => {
                const { writer } = conversionApi;
                return writer.createAttributeElement('span', { class: modelAttributeValue }, { priority: 5 });
            },
        });
    }
}
