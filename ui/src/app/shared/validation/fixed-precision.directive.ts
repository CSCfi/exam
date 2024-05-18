// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Directive, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Directive({
    selector: '[xmFixedPrecision]',
    standalone: true,
})
export class FixedPrecisionValidatorDirective {
    @Input() ngModel: number | null | undefined;
    @Output() ngModelChange = new EventEmitter<number>();

    constructor(private el: ElementRef) {}

    @HostListener('change')
    onChange() {
        const fixed = this.toFixed();
        if (fixed) {
            (this.el.nativeElement as HTMLInputElement).value = fixed;
            this.ngModelChange.emit(parseFloat(fixed));
        }
    }

    private toFixed = () => {
        if (this.ngModel == null || this.ngModel == undefined) {
            return this.ngModel;
        }
        const re = /^-?[0-9]+(\.[0-9]{1,2})?$/i;
        if (!this.ngModel.toString().match(re)) {
            return this.ngModel.toFixed(2);
        }
        return this.ngModel.toString();
    };
}
