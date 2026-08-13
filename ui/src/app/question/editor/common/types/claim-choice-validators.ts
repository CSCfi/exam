// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { FormArray, FormGroup } from '@angular/forms';

export type ClaimChoiceRowValue = {
    optionText?: string | null;
    score?: number | null;
    isSkipOption?: boolean | null;
};

/** Same rules as server `QuestionService.claimChoiceOptionsValid` (Scala). */
export function claimChoiceOptionsValid(options: ClaimChoiceRowValue[]): boolean {
    if (options.length !== 3) {
        return false;
    }
    const types = new Set<string>();
    for (const row of options) {
        const text = (row.optionText ?? '').trim();
        const scoreRaw = row.score ?? 0;
        const score = typeof scoreRaw === 'number' ? scoreRaw : Number(scoreRaw);
        const isSkip = row.isSkipOption === true;

        if (isSkip) {
            if (score !== 0 || text.length === 0) {
                return false;
            }
            types.add('SkipOption');
        } else {
            if (text.length === 0) {
                return false;
            }
            if (score > 0) {
                types.add('CorrectOption');
            } else {
                types.add('IncorrectOption');
            }
        }
    }
    return types.size === 3;
}

export const claimChoiceOptionsInvalidErrorKey = 'i18n_incorrect_claim_question_options' as const;

export function claimChoiceFormValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const form = control as FormGroup;
        const optionsArray = form.get('options');
        if (!(optionsArray instanceof FormArray)) {
            return null;
        }
        const raw = form.getRawValue() as { options: ClaimChoiceRowValue[] };
        const options = raw.options ?? [];
        if (claimChoiceOptionsValid(options)) {
            return null;
        }
        return { [claimChoiceOptionsInvalidErrorKey]: true };
    };
}
