// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

@Directive({
    selector: '[xmAutoFocus]',
    standalone: true,
})
export class AutoFocusDirective implements AfterViewInit {
    private elementRef = inject(ElementRef);

    ngAfterViewInit() {
        this.elementRef.nativeElement.focus();
    }
}
