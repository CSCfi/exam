// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    ButtonView,
    FocusCycler,
    FocusTracker,
    FocusableView,
    InputNumberView,
    InputTextView,
    KeystrokeHandler,
    LabeledFieldView,
    Locale,
    SwitchButtonView,
    View,
    ViewCollection,
    icons,
    submitHandler,
} from 'ckeditor5';
import { _t, createButton, createInput, createNumberInput } from './utils';

export class ClozeView extends View {
    answerInputView: LabeledFieldView<InputTextView>;
    caseInputView: SwitchButtonView;
    numericInputView: SwitchButtonView;
    precisionInputView: LabeledFieldView<InputNumberView>;

    saveButtonView: ButtonView;
    cancelButtonView: ButtonView;

    childViews: ViewCollection<FocusableView>;

    focusTracker = new FocusTracker();
    focusCycler: FocusCycler;
    keystrokes = new KeystrokeHandler();

    constructor(locale: Locale) {
        super(locale);

        this.answerInputView = createInput(_t('Answer', locale), this.locale);
        this.caseInputView = new SwitchButtonView(this.locale);
        this.caseInputView.set({
            label: _t('Case Sensitive', locale),
            withText: true,
        });
        this.caseInputView.on('execute', () => (this.caseInputView.isOn = !this.caseInputView.isOn));
        this.numericInputView = new SwitchButtonView(this.locale);
        this.numericInputView.set({
            label: _t('Numeric', locale),
            withText: true,
        });
        this.numericInputView.on('execute', this.numericSettingChange);

        this.precisionInputView = createNumberInput(_t('Precision', locale), this.locale);
        // jos numeric päälle -> enabloi tarkkuus, disabloi case-sensitive
        // jos numeric pois päältä -> disabloi tarkkuus, enabloi case-sensitive

        this.saveButtonView = createButton(_t('Save', locale), icons.check, 'ck-button-save');
        // Submit type of the button will trigger the submit event on entire form when clicked
        // (see submitHandler() in render() below).
        this.saveButtonView.type = 'submit';

        this.cancelButtonView = createButton(_t('Cancel', locale), icons.cancel, 'ck-button-cancel');

        // Delegate ButtonView#execute to FormView#cancel
        this.cancelButtonView.delegate('execute').to(this, 'cancel');

        this.childViews = this.createCollection([
            this.answerInputView,
            this.caseInputView,
            this.numericInputView,
            this.precisionInputView,
            this.saveButtonView,
            this.cancelButtonView,
        ]);

        this.focusCycler = new FocusCycler({
            focusables: this.childViews,
            focusTracker: this.focusTracker,
            keystrokeHandler: this.keystrokes,
            actions: {
                // Navigate form fields backwards using the Shift + Tab keystroke.
                focusPrevious: 'shift + tab',
                // Navigate form fields forwards using the Tab key.
                focusNext: 'tab',
            },
        });

        this.setTemplate({
            tag: 'form',
            attributes: {
                class: ['ck', 'ck-cloze-form'],
                tabindex: '-1',
            },
            children: this.childViews,
        });
    }

    override render() {
        super.render();

        // Submit the form when the user clicked the save button or pressed enter in the input.
        submitHandler({
            view: this,
        });

        this.childViews.forEach((view) => this.focusTracker.add(view.element as HTMLElement));
        this.keystrokes.listenTo(this.element!);
    }

    override destroy() {
        super.destroy();
        this.focusTracker.destroy();
        this.keystrokes.destroy();
    }

    focus() {
        if (this.answerInputView.isEnabled) {
            this.answerInputView.focus();
        } else {
            this.caseInputView.focus();
        }
    }

    private numericSettingChange = () => {
        const isNumeric = !this.numericInputView.isOn;
        this.numericInputView.isOn = isNumeric;
        if (isNumeric) {
            this.precisionInputView.isEnabled = true;
            this.caseInputView.isOn = false;
            this.caseInputView.isEnabled = false;
        } else {
            this.precisionInputView.isEnabled = false;
            this.precisionInputView.fieldView.value = '0';
            this.caseInputView.isEnabled = true;
        }
    };
}
