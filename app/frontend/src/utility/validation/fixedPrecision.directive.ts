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
import { Directive } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator, ValidatorFn } from '@angular/forms';

export function fixedPrecisionValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const re = /^-?[0-9]+(\.[0-9]{1,2})?$/i;
        const match = !control.value.toString().match(re);

        return match ? null : { notFixedPrecisionValue: { value: control.value } };
    };
}
@Directive({
    selector: '[fixedPrecision]',
    /* eslint-disable-next-line */
    providers: [{ provide: NG_VALIDATORS, useExisting: FixedPrecisionValidatorDirective, multi: true }],
})
export class FixedPrecisionValidatorDirective implements Validator {
    validate(control: AbstractControl): ValidationErrors | null {
        return fixedPrecisionValidator()(control);
    }
}
