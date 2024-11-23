// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    ButtonView,
    createLabeledInputNumber,
    createLabeledInputText,
    LabeledFieldView,
    Locale,
    Range,
} from 'ckeditor5';
import i18nEn from './lang/translations/en';
import i18nFi from './lang/translations/fi';
import { Dictionary } from './lang/translations/model';
import i18nSv from './lang/translations/sv';

export function getRangeText(range: Range) {
    return Array.from(range.getItems()).reduce((rangeText, node) => {
        if (!(node.is('$text') || node.is('$textProxy'))) {
            return rangeText;
        }
        return rangeText + node.data;
    }, '');
}

export function createInput(label: string, locale: Locale, info = '') {
    const input = new LabeledFieldView(locale, createLabeledInputText);
    input.label = label;
    input.infoText = info;
    return input;
}
export function createNumberInput(label: string, locale: Locale, info = '') {
    const input = new LabeledFieldView(locale, createLabeledInputNumber);
    input.label = label;
    input.infoText = info;
    input.fieldView.min = 0;
    return input;
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
