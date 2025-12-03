// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
            <form (ngSubmit)="login($event, false)">
                <div class="mb-3">
                    <label class="form-label" for="uname">{{ 'i18n_username' | translate }}</label>
                    <input
                        id="uname"
                        class="form-control w-25"
                        name="uname"
                        type="text"
                        placeholder="{{ 'i18n_username' | translate }}"
                        [(ngModel)]="username"
                        (keydown.enter)="login($event, true)"
                    />
                </div>
                <div class="mb-3">
                    <label class="form-label" for="pwd">{{ 'i18n_password' | translate }}</label>
                    <input
                        id="pwd"
                        class="form-control w-25"
                        type="password"
                        name="pwd"
                        placeholder="{{ 'i18n_password' | translate }}"
                        [(ngModel)]="password"
                        (keydown.enter)="login($event, true)"
                    />
                </div>

                <button type="submit" class="btn btn-success" id="submit">
                    {{ 'i18n_login' | translate }}
                </button>
            </form>
        </ng-template>
    `,
    imports: [FormsModule, TranslateModule, PageHeaderComponent, PageContentComponent],
})
export class DevLoginComponent {
    loggedIn = output<User>();

    username = '';
    password = '';

    private Session = inject(SessionService);

    login = (event: Event, blur: boolean) => {
        if (blur) (event.target as HTMLElement).blur();
        this.Session.login$(this.username, this.password).subscribe({
            next: (user) => this.loggedIn.emit(user),
            error: (err) => console.log(JSON.stringify(err)),
        });
    };
}
