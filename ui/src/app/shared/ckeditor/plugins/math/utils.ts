// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ButtonView, createLabeledTextarea, LabeledFieldView, Locale } from 'ckeditor5';
import i18nEn from './lang/translations/en';
import i18nFi from './lang/translations/fi';
import { Dictionary } from './lang/translations/model';
import i18nSv from './lang/translations/sv';

export function createTextarea(label: string, locale: Locale, info = '') {
    const textarea = new LabeledFieldView(locale, createLabeledTextarea);
    textarea.label = label;
    textarea.infoText = info;
    // Set some default attributes for the textarea
    textarea.fieldView.minRows = 3;
    textarea.fieldView.maxRows = 8;
    return textarea;
}

export function createButton(label: string, icon: string, className: string) {
    const button = new ButtonView();
    button.set({
        label,
        icon,
        tooltip: true,
        class: className,
    });
    return button;
}

export function _t(key: keyof Dictionary, locale: Locale) {
    switch (locale.uiLanguage) {
        case 'fi':
            return i18nFi[key];
        case 'sv':
            return i18nSv[key];
        default:
            return i18nEn[key];
    }
}
