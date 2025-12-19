// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    ButtonView,
    FocusCycler,
    FocusTracker,
    FocusableView,
    IconCancel,
    IconCheck,
    KeystrokeHandler,
    LabeledFieldView,
    Locale,
    View,
    ViewCollection,
    submitHandler,
} from 'ckeditor5';
import { _t, createButton, createTextarea } from './utils';

export class MathView extends View {
    titleView!: View;
    expressionTextarea: LabeledFieldView;
    previewContainer: View;

    saveButtonView: ButtonView;
    cancelButtonView: ButtonView;

    childViews: ViewCollection<FocusableView>;

    focusTracker = new FocusTracker();
    focusCycler: FocusCycler;
    keystrokes = new KeystrokeHandler();

    constructor(locale: Locale) {
        super(locale);

        // Create title view
        this.titleView = new View(locale);
        this.titleView.setTemplate({
            tag: 'h3',
            attributes: {
                class: ['ck', 'ck-math-title'],
                style: 'margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #333; border-bottom: 1px solid #e6e6e6; padding-bottom: 8px;',
            },
            children: [_t('toolbarLabel', locale)],
        });

        this.expressionTextarea = createTextarea(_t('mathExpression', locale), locale, _t('mathExpressionTip', locale));

        // Preview container
        this.previewContainer = new View(locale);
        this.previewContainer.setTemplate({
            tag: 'div',
            attributes: {
                class: ['ck', 'ck-math-preview'],
                style: 'min-height: 60px; border: 1px solid #d1d5db; background: #f9fafb; padding: 16px; margin: 16px 0; border-radius: 6px; display: flex; align-items: center; justify-content: center;',
            },
        });

        this.saveButtonView = createButton(_t('save', locale), IconCheck, 'ck-button-save');
        this.saveButtonView.type = 'submit';
        this.saveButtonView.bind('isEnabled').to(this.expressionTextarea, 'isEmpty', (isEmpty) => !isEmpty);

        this.cancelButtonView = createButton(_t('cancel', locale), IconCancel, 'ck-button-cancel');
        this.cancelButtonView.delegate('execute').to(this, 'cancel');

        this.childViews = this.createCollection([this.expressionTextarea, this.saveButtonView, this.cancelButtonView]);

        this.focusCycler = new FocusCycler({
            focusables: this.childViews,
            focusTracker: this.focusTracker,
            keystrokeHandler: this.keystrokes,
            actions: { focusPrevious: 'shift + tab', focusNext: 'tab' },
        });

        this.setTemplate({
            tag: 'form',
            attributes: {
                class: ['ck', 'ck-math-form'],
                tabindex: '-1',
                style: 'padding: 20px; min-width: 400px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);',
            },
            children: [
                this.titleView,
                {
                    tag: 'div',
                    attributes: {
                        class: ['ck-math-input-row'],
                        style: 'margin-bottom: 16px;',
                    },
                    children: [this.expressionTextarea],
                },
                this.previewContainer,
                {
                    tag: 'div',
                    attributes: {
                        class: ['ck-math-buttons-row'],
                        style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e6e6e6;',
                    },
                    children: [this.cancelButtonView, this.saveButtonView],
                },
            ],
        });

        // Listen for expression changes to update preview
        this.expressionTextarea.fieldView.on('input', () => this.updatePreview());
    }

    override render() {
        super.render();
        submitHandler({ view: this });
        this.childViews.forEach((view) => this.focusTracker.add(view.element as HTMLElement));
        this.keystrokes.listenTo(this.element!);
    }

    override destroy() {
        super.destroy();
        this.focusTracker.destroy();
        this.keystrokes.destroy();
    }

    focus() {
        this.expressionTextarea.focus();
    }

    async updatePreview() {
        const expression = (this.expressionTextarea.fieldView.element as HTMLTextAreaElement)?.value || '';

        if (!expression.trim()) {
            this.previewContainer.element!.innerHTML = `<em style="color: #6b7280; font-style: italic;">${_t('previewPlaceholder', this.locale!)}</em>`;
            return;
        }

        // Create math-field element and initialize it properly with MathLive
        try {
            // Ensure MathLive is loaded
            await import('mathlive');

            // Clear previous content
            this.previewContainer.element!.innerHTML = '';

            // Create and configure math-field element
            const mathField = document.createElement('math-field') as HTMLElement & { value: string };
            mathField.setAttribute('read-only', 'true');
            mathField.style.fontSize = '18px';

            // Set the value - this is what makes MathLive render it
            mathField.value = expression;

            // Append to preview container
            this.previewContainer.element!.appendChild(mathField);
        } catch (error) {
            console.error('Failed to render math preview:', error);
            // Fallback to showing the raw LaTeX
            this.previewContainer.element!.textContent = expression;
        }
    }

    setTitle(title: string) {
        if (this.titleView.element) {
            this.titleView.element.textContent = title;
        }
    }
}
