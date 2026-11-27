// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    input,
    output,
    signal,
    ViewChild,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-password-prompt',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormField, TranslateModule],
    template: `
        @if (visible()) {
            <form role="form" (submit)="submit()" aria-labelledby="password-prompt-title">
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
                            [formField]="passwordForm.password"
                            [class.is-invalid]="passwordForm.password().invalid() && passwordForm.password().touched()"
                            [attr.aria-describedby]="
                                passwordForm.password().invalid() && passwordForm.password().touched()
                                    ? 'password-error'
                                    : 'password-help'
                            "
                            [ariaInvalid]="passwordForm.password().invalid() && passwordForm.password().touched()"
                            placeholder="{{ 'i18n_enter_password' | translate }}"
                        />
                        <div id="password-help" class="form-text visually-hidden">
                            {{ 'i18n_enter_password' | translate }}
                        </div>
                        @if (passwordForm.password().invalid() && passwordForm.password().touched()) {
                            <div id="password-error" class="invalid-feedback" role="alert" aria-live="polite">
                                {{ 'i18n_password_required' | translate }}
                            </div>
                        }
                    </div>
                    <div class="col-md-6">
                        <button
                            type="submit"
                            class="btn btn-success"
                            [disabled]="passwordForm.password().invalid()"
                            [attr.aria-describedby]="passwordForm.password().invalid() ? 'password-error' : null"
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

    readonly visible = input(false);
    readonly passwordValidated = output<string>();

    readonly passwordForm = form(signal({ password: '' }), (path) => {
        required(path.password);
    });

    ngAfterViewInit() {
        this.passwordInput?.nativeElement.focus();
    }

    submit() {
        const passwordField = this.passwordForm.password();
        if (!passwordField.invalid()) {
            this.passwordValidated.emit(passwordField.value());
        }
    }
}
