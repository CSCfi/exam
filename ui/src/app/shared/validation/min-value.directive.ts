import { Directive, Input } from '@angular/core';
import type { AbstractControl, ValidationErrors, Validator } from '@angular/forms';
import { NG_VALIDATORS, Validators } from '@angular/forms';

@Directive({
    selector: '[xmMin]',
    providers: [{ provide: NG_VALIDATORS, useExisting: MinDirective, multi: true }],
})
export class MinDirective implements Validator {
    @Input() xmMin = 0;

    validate(control: AbstractControl): ValidationErrors | null {
        return Validators.min(this.xmMin)(control);
    }
}
