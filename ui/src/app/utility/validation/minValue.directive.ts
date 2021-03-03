import { Directive, Input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator, Validators } from '@angular/forms';

@Directive({
    selector: '[appMin]',
    /* eslint-disable-next-line */
    providers: [{ provide: NG_VALIDATORS, useExisting: MinDirective, multi: true }],
})
export class MinDirective implements Validator {
    @Input() min: number;

    validate(control: AbstractControl): ValidationErrors | null {
        return Validators.min(this.min)(control);
    }
}
