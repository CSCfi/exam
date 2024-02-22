/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import type { User } from '../session.service';
import { SessionService } from '../session.service';

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

                <button type="submit" class="xm-ok-button" id="submit">
                    {{ 'i18n_login' | translate }}
                </button>
            </form>
        </ng-template>
    `,
    standalone: true,
    imports: [FormsModule, TranslateModule, PageHeaderComponent, PageContentComponent],
})
export class DevLoginComponent {
    @Output() loggedIn = new EventEmitter<User>();

    username = '';
    password = '';

    constructor(private Session: SessionService) {}

    login = (event: Event, blur: boolean) => {
        if (blur) (event.target as HTMLElement).blur();
        this.Session.login$(this.username, this.password).subscribe({
            next: (user) => this.loggedIn.emit(user),
            error: (err) => console.log(JSON.stringify(err)),
        });
    };
}
