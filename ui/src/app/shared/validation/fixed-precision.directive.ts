/*
 * Copyright (c) 2018 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
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
        (this.el.nativeElement as HTMLInputElement).value = fixed;
        this.ngModelChange.emit(parseFloat(fixed));
    }

    private toFixed = () => {
        if (this.ngModel == null || this.ngModel == undefined) {
            return '';
        }
        const re = /^-?[0-9]+(\.[0-9]{1,2})?$/i;
        if (!this.ngModel.toString().match(re)) {
            return this.ngModel.toFixed(2);
        }
        return this.ngModel.toString();
    };
}
