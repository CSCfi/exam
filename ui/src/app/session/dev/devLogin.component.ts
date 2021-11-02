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

import { SessionService } from '../session.service';

import type { User } from '../session.service';
@Component({
    selector: 'dev-login',
    template: `
        <div class="container-fluid">
            <div class="row mart20">
                <div class="col-md-12">
                    <div class="student-details-title-wrap">
                        <div class="student-enroll-title">{{ 'sitnet_login' | translate }}</div>
                    </div>
                </div>
            </div>
            <div class="row marl20">
                <div class="col">
                    <form (ngSubmit)="login($event, false)">
                        <div class="form-group">
                            <label for="uname">{{ 'sitnet_username' | translate }}</label>
                            <input
                                id="uname"
                                class="form-control login"
                                name="uname"
                                type="text"
                                placeholder="{{ 'sitnet_username' | translate }}"
                                [(ngModel)]="username"
                                (keydown.enter)="login($event, true)"
                            />
                        </div>
                        <div class="form-group">
                            <label for="pwd">{{ 'sitnet_password' | translate }}</label>
                            <input
                                id="pwd"
                                class="form-control login"
                                type="password"
                                name="pwd"
                                placeholder="{{ 'sitnet_password' | translate }}"
                                [(ngModel)]="password"
                                (keydown.enter)="login($event, true)"
                            />
                        </div>

                        <button type="submit" class="btn btn-primary" id="submit">
                            {{ 'sitnet_login' | translate }}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `,
})
export class DevLoginComponent {
    @Output() onLoggedIn = new EventEmitter<User>();

    username: string;
    password: string;

    constructor(private Session: SessionService) {}

    login = (event: Event, blur: boolean) => {
        if (blur) (event.target as HTMLElement).blur();
        this.Session.login$(this.username, this.password).subscribe(
            (user) => this.onLoggedIn.emit(user),
            (err) => console.log(JSON.stringify(err)),
        );
    };
}
