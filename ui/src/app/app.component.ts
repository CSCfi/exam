/*
 * Copyright (c) 2018 Exam Consortium
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
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeFi from '@angular/common/locales/fi';
import localeSv from '@angular/common/locales/sv';
import { Component } from '@angular/core';
import { StateService } from '@uirouter/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ExaminationStatusService } from './examination/examinationStatus.service';
import { SessionService } from './session/session.service';
import { WindowRef } from './utility/window/window.service';

import type { User } from './session/session.service';
@Component({
    selector: 'app',
    template: `
        <div *ngIf="!user && devLoginRequired">
            <dev-login (onLoggedIn)="setUser($event)"></dev-login>
        </div>
        <div *ngIf="user">
            <navigation [hidden]="hideNavBar"></navigation>
            <main
                id="mainView"
                class="container-fluid"
                [ngClass]="{
                    'vmenu-on': !hideNavBar && !user?.isAdmin,
                    'vmenu-on-admin': user?.isAdmin
                }"
            >
                <ui-view></ui-view>
            </main>
        </div>
    `,
})
export class AppComponent {
    user?: User;
    hideNavBar = false;
    devLoginRequired: boolean;
    private ngUnsubscribe = new Subject();

    constructor(
        private Window: WindowRef,
        private state: StateService,
        private Session: SessionService,
        private ExaminationStatus: ExaminationStatusService,
    ) {
        this.ExaminationStatus.examinationStarting$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
            this.hideNavBar = true;
        });
        this.ExaminationStatus.examinationEnding$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
            this.hideNavBar = false;
        });
        this.Session.devLogoutChange$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
            delete this.user;
            this.state.go('app');
        });
        registerLocaleData(localeSv);
        registerLocaleData(localeFi);
        registerLocaleData(localeEn);
    }

    ngOnInit() {
        const storedUser: string = this.Window.nativeWindow.sessionStorage['EXAM_USER'];
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (!user.loginRole) {
                // This happens if user refreshes the tab before having selected a login role,
                // lets just throw him out.
                this.Session.logout();
                return;
            }
            this.Session.setEnv();
            this.Session.setUser(user);
            this.Session.translate(user.lang);
            this.Session.restartSessionCheck();
            this.user = user;
        } else {
            this.Session.switchLanguage('en');
            this.Session.getEnv$().subscribe(
                (value: 'DEV' | 'PROD') => {
                    if (value === 'PROD') {
                        this.Session.login$('', '').subscribe((user) => (this.user = user));
                    }
                    this.devLoginRequired = value === 'DEV';
                },
                () => console.log('no env found'),
            );
        }
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    setUser(user: User) {
        this.user = user;
    }
}
