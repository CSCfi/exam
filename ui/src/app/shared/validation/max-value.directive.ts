import { Directive, Input } from '@angular/core';
import type { AbstractControl, ValidationErrors, Validator } from '@angular/forms';
import { NG_VALIDATORS, Validators } from '@angular/forms';

@Directive({
    selector: '[xmMax]',
    providers: [{ provide: NG_VALIDATORS, useExisting: MaxDirective, multi: true }],
    standalone: true,
})
export class MaxDirective implements Validator {
    @Input() xmMax = 0;

    validate(control: AbstractControl): ValidationErrors | null {
        return Validators.max(this.xmMax)(control);
    }
}
