// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { toFixedPrecisionString } from 'src/app/shared/validation/fixed-precision.util';

@Directive({
    selector: '[xmFixedPrecision]',
})
export class FixedPrecisionValidatorDirective {
    private readonly el = inject(ElementRef);
    private readonly ngControl = inject(NgControl, { optional: true, self: true });

    @HostListener('change')
    onChange() {
        const value = this.ngControl?.control?.value;
        const fixed = toFixedPrecisionString(value);
        if (fixed) {
            (this.el.nativeElement as HTMLInputElement).value = fixed;
            this.ngControl?.control?.setValue(parseFloat(fixed));
        }
    }
}
