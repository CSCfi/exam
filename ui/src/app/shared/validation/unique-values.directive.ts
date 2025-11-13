// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Directive } from '@angular/core';
import type { AbstractControl, ValidationErrors, Validator, ValidatorFn } from '@angular/forms';
import { NG_VALIDATORS } from '@angular/forms';

/**
 * Validator for FormArray that checks if values extracted by a key selector are unique
 */
export function UniquenessValidator(keySelector: (item: unknown) => unknown): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!Array.isArray(value)) {
            return null;
        }
        const items = value.map(keySelector).filter((item) => item !== null && item !== undefined);
        const uniqueItems = new Set(items);
        return uniqueItems.size !== items.length ? { nonUniqueValue: { value: items } } : null;
    };
}
@Directive({
    selector: '[xmUniqueValues]',
    providers: [{ provide: NG_VALIDATORS, useExisting: UniqueValuesValidatorDirective, multi: true }],
    standalone: true,
})
export class UniqueValuesValidatorDirective implements Validator {
    validate(control: AbstractControl): ValidationErrors | null {
        return UniquenessValidator((item: unknown) => item)(control);
    }
}
