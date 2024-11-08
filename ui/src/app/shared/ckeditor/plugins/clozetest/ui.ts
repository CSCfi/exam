// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ButtonView, ContextualBalloon, Plugin, PositionOptions, clickOutsideHandler } from 'ckeditor5';
import { getRangeText } from './utils';
import { ClozeView } from './view';

export type CommandValue = { text: string; precision: string; numeric: boolean; caseSensitive: boolean };

export class ClozeUI extends Plugin {
    balloon!: ContextualBalloon;
    formView!: ClozeView;

    static get requires() {
        return [ContextualBalloon];
    }

    init = () => {
        const editor = this.editor;

        // Create the balloon and the form view.
        this.balloon = this.editor.plugins.get(ContextualBalloon);
        this.formView = this.createFormView();

        editor.ui.componentFactory.add('cloze', () => {
            const button = new ButtonView();
            button.icon = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.204 11.078c.767 0 1.201-.356 1.406-.737h.059V11h1.216V7.519c0-1.314-.947-1.783-2.11-1.783C1.355 5.736.75 6.42.69 7.27h1.216c.064-.323.313-.552.84-.552s.864.249.864.771v.464H2.346C1.145 7.953.5 8.568.5 9.496c0 .977.693 1.582 1.704 1.582m.42-.947c-.44 0-.845-.235-.845-.718 0-.395.269-.684.84-.684h.991v.538c0 .503-.444.864-.986.864m5.593.937c1.216 0 1.948-.869 1.948-2.31v-.702c0-1.44-.727-2.305-1.929-2.305-.742 0-1.328.347-1.499.889h-.063V3.983h-1.29V11h1.27v-.791h.064c.21.532.776.86 1.499.86Zm-.43-1.025c-.66 0-1.113-.518-1.113-1.28V8.12c0-.825.42-1.343 1.098-1.343.684 0 1.075.518 1.075 1.416v.45c0 .888-.386 1.401-1.06 1.401Zm2.834-1.328c0 1.47.87 2.378 2.305 2.378 1.416 0 2.139-.777 2.158-1.763h-1.186c-.06.425-.313.732-.933.732-.66 0-1.05-.512-1.05-1.352v-.625c0-.81.371-1.328 1.045-1.328.635 0 .879.425.918.776h1.187c-.02-.986-.787-1.806-2.14-1.806-1.41 0-2.304.918-2.304 2.338z"/>
                </svg>`;
            button.tooltip = 'cloze test';
            button.withText = false;

            // Show the UI on button click.
            this.listenTo(button, 'execute', () => {
                this.showUI();
            });

            return button;
        });
    };

    private createFormView = () => {
        const formView = new ClozeView(this.editor.locale);

        // Execute the command after clicking the "Save" button.
        this.listenTo(formView, 'submit', () => {
            const caseSensitive = formView.caseInputView.isOn;
            const numeric = formView.numericInputView.isOn;
            const text = formView.answerInputView.fieldView.element?.value || '';
            const id = formView.precisionInputView.fieldView.element?.value || '';

            this.editor.execute('addCloze', {
                caseSensitive: caseSensitive,
                numeric: numeric,
                text: text,
                precision: id,
            });

            // Hide the form view after submit.
            this.hideUI();
        });

        // Hide the form view after clicking the "Cancel" button.
        this.listenTo(formView, 'cancel', () => {
            this.hideUI();
        });

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

    private showUI() {
        const selection = this.editor.model.document.selection;

        this.balloon.add({
            view: this.formView,
            position: this.getBalloonPositionData(),
        });
        // Disable the input when the selection is not collapsed.
        this.formView.answerInputView.isEnabled = selection.getFirstRange()!.isCollapsed;

        // Check the value of the command.
        const commandValue = this.editor.commands.get('addCloze')!.value as CommandValue;
        if (commandValue) {
            this.formView.answerInputView.fieldView.value = commandValue.text;
            this.formView.caseInputView.isOn = commandValue.caseSensitive;
            this.formView.numericInputView.isOn = commandValue.numeric;
            this.formView.precisionInputView.fieldView.value = commandValue.precision;
        }
        // If the command has no value, put the currently selected text (not collapsed)
        // in the first field and empty the others.
        else {
            const selectedText = getRangeText(selection.getFirstRange()!);
            this.formView.answerInputView.fieldView.value = selectedText;
            this.formView.caseInputView.isOn = false;
            this.formView.numericInputView.isOn = false;
            this.formView.precisionInputView.fieldView.value = '';
        }

        this.formView.focus();
    }

    private hideUI() {
        // Clear the input field values and reset the form.
        this.formView.answerInputView.fieldView.value = '';
        this.formView.caseInputView.isOn = false;
        this.formView.numericInputView.isOn = false;
        if (this.formView.element) (this.formView.element as HTMLFormElement).reset();

        this.balloon.remove(this.formView);

        // Focus the editing view after inserting the abbreviation so the user can start typing the content
        // right away and keep the editor focused.
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
