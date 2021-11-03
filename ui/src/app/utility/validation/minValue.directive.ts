import { Directive, Input } from '@angular/core';
import { NG_VALIDATORS, Validators } from '@angular/forms';

import type { Validator, AbstractControl, ValidationErrors } from '@angular/forms';
@Directive({
    selector: '[min]',
    providers: [{ provide: NG_VALIDATORS, useExisting: MinDirective, multi: true }],
})
export class MinDirective implements Validator {
    @Input() min = 0;

    validate(control: AbstractControl): ValidationErrors | null {
        return Validators.min(this.min)(control);
    }
}
