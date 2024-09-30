// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Directive, ElementRef, Input, OnChanges } from '@angular/core';

@Directive({
    selector: '[xmMathJax]',
    standalone: true,
})
export class MathJaxDirective implements OnChanges {
    @Input('xmMathJax') math?: string;

    constructor(private el: ElementRef) {}

    ngOnChanges() {
        this.el.nativeElement.innerHTML = this.math || '';
        MathJax.Hub.Queue(['Typeset', MathJax.Hub, this.el.nativeElement]);
    }
}
