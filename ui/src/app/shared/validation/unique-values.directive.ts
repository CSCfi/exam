// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Directive } from '@angular/core';
import type { AbstractControl, ValidationErrors, Validator, ValidatorFn } from '@angular/forms';
import { NG_VALIDATORS } from '@angular/forms';

export function uniqueValuesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const items = Object.values(control.value);
        return new Set(items).size !== items.length ? { nonUniqueValue: { value: control.value } } : null;
    };
}
@Directive({
    selector: '[xmUniqueValues]',
    providers: [{ provide: NG_VALIDATORS, useExisting: UniqueValuesValidatorDirective, multi: true }],
    standalone: true,
})
export class UniqueValuesValidatorDirective implements Validator {
    validate(control: AbstractControl): ValidationErrors | null {
        return uniqueValuesValidator()(control);
    }
}
