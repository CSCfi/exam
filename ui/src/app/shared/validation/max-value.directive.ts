import { Directive, Input } from '@angular/core';
import type { AbstractControl, ValidationErrors, Validator } from '@angular/forms';
import { NG_VALIDATORS, Validators } from '@angular/forms';

@Directive({
    selector: '[max]',
    providers: [{ provide: NG_VALIDATORS, useExisting: MaxDirective, multi: true }],
})
export class MaxDirective implements Validator {
    @Input() max = 0;

    validate(control: AbstractControl): ValidationErrors | null {
        return Validators.max(this.max)(control);
    }
}
