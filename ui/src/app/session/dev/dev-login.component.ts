// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';

@Component({
    selector: 'xm-dev-login',
    template: `
        <div class="container-fluid">
            <xm-page-header text="i18n_login" />
            <xm-page-content [content]="content" />
        </div>
        <ng-template #content>
            <form (submit)="login($event, false)">
                <div class="mb-3">
                    <label class="form-label" for="uname">{{ 'i18n_username' | translate }}</label>
                    <input
                        id="uname"
                        class="form-control w-25"
                        type="text"
                        placeholder="{{ 'i18n_username' | translate }}"
                        [formField]="loginForm.username"
                        (keydown.enter)="login($event, true)"
                    />
                </div>
                <div class="mb-3">
                    <label class="form-label" for="pwd">{{ 'i18n_password' | translate }}</label>
                    <input
                        id="pwd"
                        class="form-control w-25"
                        type="password"
                        placeholder="{{ 'i18n_password' | translate }}"
                        [formField]="loginForm.password"
                        (keydown.enter)="login($event, true)"
                    />
                </div>
                <button type="submit" class="btn btn-success" id="submit">
                    {{ 'i18n_login' | translate }}
                </button>
            </form>
        </ng-template>
    `,
    imports: [FormField, TranslateModule, PageHeaderComponent, PageContentComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevLoginComponent {
    readonly loggedIn = output<User>();

    readonly loginForm = form(signal({ username: '', password: '' }));

    private readonly Session = inject(SessionService);

    login(event: Event, blur: boolean) {
        if (blur) (event.target as HTMLElement).blur();
        this.Session.login$(this.loginForm.username().value(), this.loginForm.password().value()).subscribe({
            next: (user) => this.loggedIn.emit(user),
            error: (err) => console.error(JSON.stringify(err)),
        });
    }
}
