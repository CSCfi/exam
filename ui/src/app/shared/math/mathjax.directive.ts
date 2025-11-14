// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';
import { MathJaxService } from './mathjax.service';

@Directive({
    selector: '[xmMathJax]',
})
export class MathJaxDirective implements OnChanges {
    @Input('xmMathJax') math?: string;

    private el = inject(ElementRef);
    private mathJaxService = inject(MathJaxService);

    async ngOnChanges() {
        this.el.nativeElement.innerHTML = this.math || '';
        await this.mathJaxService.typeset([this.el.nativeElement]);
    }
}
