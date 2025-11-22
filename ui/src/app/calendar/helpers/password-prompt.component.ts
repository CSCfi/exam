// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, input, output, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-password-prompt',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, TranslateModule],
    template: `
        @if (visible()) {
            <form [formGroup]="passwordForm" role="form" (ngSubmit)="submit()" aria-labelledby="password-prompt-title">
                <div class="row">
                    <div class="col-md-12">
                        <div class="alert alert-warning mb-3" role="alert" aria-live="polite">
                            <i class="bi bi-lock me-2" aria-hidden="true"></i>
                            <span id="password-prompt-title">{{
                                'i18n_room_password_required_message' | translate
                            }}</span>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <label for="password" class="form-label visually-hidden">
                            {{ 'i18n_password' | translate }}
                        </label>
                        <input
                            #passwordInput
                            type="password"
                            class="form-control"
                            id="password"
                            autocomplete="current-password"
                            formControlName="password"
                            [class.is-invalid]="
                                passwordForm.get('password')?.invalid && passwordForm.get('password')?.touched
                            "
                            [attr.aria-describedby]="
                                passwordForm.get('password')?.invalid && passwordForm.get('password')?.touched
                                    ? 'password-error'
                                    : 'password-help'
                            "
                            [attr.aria-invalid]="
                                passwordForm.get('password')?.invalid && passwordForm.get('password')?.touched
                            "
                            placeholder="{{ 'i18n_enter_password' | translate }}"
                        />
                        <div id="password-help" class="form-text visually-hidden">
                            {{ 'i18n_enter_password' | translate }}
                        </div>
                        @if (passwordForm.get('password')?.invalid && passwordForm.get('password')?.touched) {
                            <div id="password-error" class="invalid-feedback" role="alert" aria-live="polite">
                                {{ 'i18n_password_required' | translate }}
                            </div>
                        }
                    </div>
                    <div class="col-md-6">
                        <button
                            type="submit"
                            class="btn btn-success"
                            [disabled]="passwordForm.invalid"
                            [attr.aria-describedby]="passwordForm.invalid ? 'password-error' : null"
                        >
                            {{ 'i18n_confirm' | translate }}
                        </button>
                    </div>
                </div>
            </form>
        }
    `,
})
export class PasswordPromptComponent implements AfterViewInit {
    @ViewChild('passwordInput') passwordInput!: ElementRef<HTMLInputElement>;

    visible = input(false);
    passwordValidated = output<string>();

    passwordForm = new FormGroup({ password: new FormControl('', [Validators.required]) });

    ngAfterViewInit() {
        this.passwordInput?.nativeElement.focus();
    }

    submit() {
        if (this.passwordForm.valid) {
            this.passwordValidated.emit(this.passwordForm.value.password ?? '');
        }
    }
}
