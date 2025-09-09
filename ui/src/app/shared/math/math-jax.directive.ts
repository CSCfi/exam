// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';

@Directive({
    selector: '[xmMathJax]',
    standalone: true,
})
export class MathJaxDirective implements OnChanges {
    @Input('xmMathJax') math?: string;

    private el = inject(ElementRef);

    ngOnChanges() {
        this.el.nativeElement.innerHTML = this.math || '';
        window.MathJax.typesetPromise([this.el.nativeElement]);
    }
}
