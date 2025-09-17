// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Plugin } from 'ckeditor5';

import { MathEditing } from './editing.js';
import { MathUI } from './ui.js';

export class Math extends Plugin {
    static get requires() {
        return [MathEditing, MathUI];
    }
    public static get pluginName() {
        return 'Math' as const;
    }
}
