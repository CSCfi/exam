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
import { Directive, Input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, Validator, ValidatorFn } from '@angular/forms';

export function uniqueValuesValidator(property: string, values: { [key: string]: unknown }[]): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
        const matches = values.filter(v => v[property] === control.value);
        return matches.length > 1 ? { nonUniqueValue: { value: control.value } } : null;
    };
}
@Directive({
    selector: '[appUniqueValues]',
    /* eslint-disable-next-line */
    providers: [{ provide: NG_VALIDATORS, useExisting: UniqueValuesValidatorDirective, multi: true }],
})
export class UniqueValuesValidatorDirective implements Validator {
    @Input('appUniqueValues') values: { [key: string]: unknown }[];
    @Input() property: string;

    validate(control: AbstractControl): { [key: string]: any } | null {
        return this.values && this.property ? uniqueValuesValidator(this.property, this.values)(control) : null;
    }
}
