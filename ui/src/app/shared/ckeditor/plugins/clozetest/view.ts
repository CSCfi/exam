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
    caseButtonView: SwitchButtonView;
    numericButtonView: SwitchButtonView;
    precisionInputView: LabeledFieldView<InputNumberView>;

    saveButtonView: ButtonView;
    cancelButtonView: ButtonView;

    childViews: ViewCollection<FocusableView>;

    focusTracker = new FocusTracker();
    focusCycler: FocusCycler;
    keystrokes = new KeystrokeHandler();

    _error = false;

    constructor(locale: Locale) {
        super(locale);

        this.answerInputView = createInput(_t('answerLabel', locale), locale);
        this.caseButtonView = new SwitchButtonView(this.locale);
        this.caseButtonView.set({
            label: _t('caseSensitiveLabel', locale),
            tooltip: _t('caseSensitiveTip', locale),
            withText: true,
        });
        this.caseButtonView.on('execute', () => (this.caseButtonView.isOn = !this.caseButtonView.isOn));
        this.numericButtonView = new SwitchButtonView(this.locale);
        this.numericButtonView.set({
            label: _t('numericLabel', locale),
            withText: true,
        });
        this.numericButtonView.on('execute', this.numericSettingChange);
        this.precisionInputView = createNumberInput(_t('precisionLabel', locale), locale, _t('precisionTip', locale));

        this.saveButtonView = createButton(_t('save', locale), icons.check, 'ck-button-save');
        this.saveButtonView.type = 'submit'; // (see submitHandler() in render() below).
        // unfortunately it seems that input view value changes do not fire events, pretty hard to do validation :(
        this.saveButtonView.bind('isEnabled').to(this.answerInputView, 'errorText', (e) => e === null);
        this.cancelButtonView = createButton(_t('cancel', locale), icons.cancel, 'ck-button-cancel');
        this.cancelButtonView.delegate('execute').to(this, 'cancel');

        this.childViews = this.createCollection([
            this.answerInputView,
            this.caseButtonView,
            this.numericButtonView,
            this.precisionInputView,
            this.saveButtonView,
            this.cancelButtonView,
        ]);

        this.focusCycler = new FocusCycler({
            focusables: this.childViews,
            focusTracker: this.focusTracker,
            keystrokeHandler: this.keystrokes,
            actions: { focusPrevious: 'shift + tab', focusNext: 'tab' },
        });

        this.setTemplate({
            tag: 'form',
            attributes: { class: ['ck', 'ck-cloze-form'], tabindex: '-1' },
            children: this.childViews,
        });
    }

    override render() {
        super.render();

        // Submit the form when the user clicked the save button or pressed enter in the input.
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
        if (this.answerInputView.isEnabled) {
            this.answerInputView.focus();
        } else {
            this.caseButtonView.focus();
        }
    }

    private numericSettingChange = () => {
        const isNumeric = !this.numericButtonView.isOn;
        this.numericButtonView.isOn = isNumeric;
        if (isNumeric) {
            this.precisionInputView.isEnabled = true;
            this.caseButtonView.isOn = false;
            this.caseButtonView.isEnabled = false;
            if (isNaN(+(this.answerInputView.fieldView.element?.value as string))) {
                this.answerInputView.errorText = _t('numericError', this.locale!);
            } else {
                this.answerInputView.errorText = null;
            }
        } else {
            this.precisionInputView.isEnabled = false;
            this.precisionInputView.fieldView.value = '0';
            this.caseButtonView.isEnabled = true;
            this.answerInputView.errorText = null;
        }
    };
}
