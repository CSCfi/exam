// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ButtonView, ContextualBalloon, Plugin, PositionOptions, clickOutsideHandler } from 'ckeditor5';
import { _t } from './utils';
import { MathView } from './view';

export type CommandValue = { expression: string; renderer: 'mathlive' | 'mathjax' };

export class MathUI extends Plugin {
    balloon!: ContextualBalloon;
    formView!: MathView;

    static get requires() {
        return [ContextualBalloon];
    }

    init = () => {
        const editor = this.editor;

        // Create the balloon and the form view.
        this.balloon = this.editor.plugins.get(ContextualBalloon);
        this.formView = this.createFormView();

        editor.ui.componentFactory.add('math', () => {
            const button = new ButtonView();
            button.icon = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2 3h10a.5.5 0 0 1 0 1H3.7l3.8 4-3.8 4H12a.5.5 0 0 1 0 1H2a.5.5 0 0 1-.4-.2.5.5 0 0 1 .1-.7L6.3 8 1.7 3.9a.5.5 0 0 1 .3-.9z"/>
                </svg>`;

            // Update tooltip based on whether we're editing or creating
            const command = editor.commands.get('insertMath')!;
            this.listenTo(command, 'change:value', () => {
                if (command.value) {
                    button.tooltip = _t('editMathFormula', editor.locale) + ' (⇧⌘M)';
                    button.isOn = true;
                } else {
                    button.tooltip = _t('toolbarLabel', editor.locale) + ' (⇧⌘M)';
                    button.isOn = false;
                }
            });

            button.tooltip = _t('toolbarLabel', editor.locale) + ' (⇧⌘M)';
            button.withText = false;

            // Show the UI on button click.
            this.listenTo(button, 'execute', () => this.showUI());

            return button;
        });

        // Add keyboard shortcut
        editor.keystrokes.set('Shift+Ctrl+M', (keyEvtData, cancel) => {
            cancel();
            this.showUI();
        });
    };

    showUI() {
        const commandValue = this.editor.commands.get('insertMath')!.value as CommandValue | null;
        const isEditing = !!commandValue;

        // Update form title based on editing state
        if (isEditing) {
            this.formView.setTitle(_t('editMathFormulaTitle', this.editor.locale));
        } else {
            this.formView.setTitle(_t('insertMathFormulaTitle', this.editor.locale));
        }

        this.balloon.add({
            view: this.formView,
            position: this.getBalloonPositionData(),
        });

        // Check the value of the command.
        if (commandValue) {
            (this.formView.expressionTextarea.fieldView.element as HTMLTextAreaElement).value = commandValue.expression;
        } else {
            // Clear form for new math expression
            (this.formView.expressionTextarea.fieldView.element as HTMLTextAreaElement).value = '';
        }

        // Trigger preview update
        this.formView.updatePreview();
        this.formView.focus();
    }

    private createFormView = () => {
        const formView = new MathView(this.editor.locale);

        // Execute the command after clicking the "Save" button.
        this.listenTo(formView, 'submit', () => {
            const expression = (formView.expressionTextarea.fieldView.element as HTMLTextAreaElement)?.value || '';

            if (expression.trim()) {
                this.editor.execute('insertMath', {
                    expression: expression.trim(),
                    renderer: 'mathlive', // Always use MathLive
                });
                // Hide the form view after submit.
                this.hideUI();
            }
        });

        // Hide the form view after clicking the "Cancel" button.
        this.listenTo(formView, 'cancel', () => this.hideUI());

        // Hide the form view when clicking outside the balloon.
        clickOutsideHandler({
            emitter: formView,
            activator: () => this.balloon.visibleView === formView,
            contextElements: [this.balloon.view.element as HTMLElement],
            callback: () => this.hideUI(),
        });

        // And when ESC is pressed
        formView.keystrokes.set('Esc', (data, cancel) => {
            this.hideUI();
            cancel();
        });

        return formView;
    };

    private hideUI() {
        // Clear the input field values and reset the form.
        (this.formView.expressionTextarea.fieldView.element as HTMLTextAreaElement).value = '';
        if (this.formView.element) (this.formView.element as HTMLFormElement).reset();

        this.balloon.remove(this.formView);

        // Focus the editing view after inserting the math so the user can continue typing
        this.editor.editing.view.focus();
    }

    private getBalloonPositionData = (): Partial<PositionOptions> => {
        const view = this.editor.editing.view;
        const viewDocument = view.document;
        const range = viewDocument.selection.getFirstRange();

        // Set a target position by converting view selection range to DOM.
        if (range) return { target: () => view.domConverter.viewRangeToDom(range) };
        return { target: undefined };
    };
}
