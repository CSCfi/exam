// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { FormArray, FormGroup } from '@angular/forms';

/**
 * Validator that checks if a FormArray has at least the minimum number of options
 */
export function minOptionsValidator(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const optionsArray = control as FormArray;
        if (!optionsArray || !Array.isArray(optionsArray.controls)) {
            return null;
        }

        if (optionsArray.length < min) {
            return {
                minOptions: {
                    required: min,
                    actual: optionsArray.length,
                },
            };
        }

        return null;
    };
}

export function multipleChoiceOptionsValidator(control: AbstractControl): ValidationErrors | null {
    const error = minOptionsValidator(2)(control);
    if (error) {
        return error;
    }

    const optionsArray = control as FormArray;
    const options = optionsArray.controls;
    const errors: ValidationErrors = {};

    // Check at least one correct option
    const hasCorrectOption = options.some((optionControl) => {
        const optionGroup = optionControl as FormGroup;
        const correctOptionControl = optionGroup?.get('correctOption');
        return correctOptionControl?.value === true;
    });

    if (!hasCorrectOption) {
        errors['noCorrectOption'] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
}
