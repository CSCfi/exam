// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
    selector: '[xmLowerCase]',
    standalone: true,
})
export class LowerCaseValidatorDirective {
    constructor(private el: ElementRef) {}

    @HostListener('input')
    onInput() {
        const native = this.el.nativeElement as HTMLInputElement;
        native.value = native.value.toLowerCase();
    }
}
