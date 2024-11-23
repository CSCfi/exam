// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Plugin } from 'ckeditor5';

import { ClozeEditing } from './editing';
import { ClozeUI } from './ui';

export class Cloze extends Plugin {
    static get requires() {
        return [ClozeEditing, ClozeUI];
    }
    public static get pluginName() {
        return 'ClozeTest' as const;
    }
}
