// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function UniquenessValidator(keySelector: (item: unknown) => unknown): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!Array.isArray(value)) return null;
        const items = value.map(keySelector).filter((item) => item !== null && item !== undefined);
        const uniqueItems = new Set(items);
        return uniqueItems.size !== items.length ? { nonUniqueValue: { value: items } } : null;
    };
}
