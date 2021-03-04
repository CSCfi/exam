import { Directive, Input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator, Validators } from '@angular/forms';

@Directive({
    selector: '[max]',
    /* eslint-disable-next-line */
    providers: [{ provide: NG_VALIDATORS, useExisting: MaxDirective, multi: true }],
})
export class MaxDirective implements Validator {
    @Input() max: number;

    validate(control: AbstractControl): ValidationErrors | null {
        return Validators.max(this.max)(control);
    }
}
