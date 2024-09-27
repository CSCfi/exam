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
import { NgClass, registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeFi from '@angular/common/locales/fi';
import localeSv from '@angular/common/locales/sv';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ExaminationStatusService } from './examination/examination-status.service';
import { NavigationComponent } from './navigation/navigation.component';
import { DevLoginComponent } from './session/dev/dev-login.component';
import type { User } from './session/session.service';
import { SessionService } from './session/session.service';

@Component({
    selector: 'xm-app',
    template: `
        @if (!user && devLoginRequired) {
            <div>
                <xm-dev-login (loggedIn)="setUser($event)"></xm-dev-login>
            </div>
        }
        @if (user) {
            <div>
                <xm-navigation [hidden]="hideNavBar"></xm-navigation>
                <main id="mainView" class="container-fluid" [ngClass]="{ 'vmenu-on': !hideNavBar }">
                    <router-outlet></router-outlet>
                </main>
            </div>
        }
    `,
    styles: [
        `
            #mainView {
                width: auto !important;
                @media print {
                    margin: 0 15px;
                    max-width: 1000px;
                }
            }
            .vmenu-on {
                width: auto;
                margin-left: 17.025em !important;

                @media (max-width: 920px) {
                    margin-left: 0 !important;
                    padding-left: 0;
                    padding-right: 0;
                }

                @media print {
                    overflow-x: visible;
                }
            }
        `,
    ],
    standalone: true,
    imports: [DevLoginComponent, NavigationComponent, NgClass, RouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
    user?: User;
    hideNavBar = false;
    devLoginRequired = false;
    private ngUnsubscribe = new Subject();

    constructor(
        private router: Router,
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
            this.router.navigate(['']);
        });
        registerLocaleData(localeSv);
        registerLocaleData(localeFi);
        registerLocaleData(localeEn);
    }

    ngOnInit() {
        const user = this.Session.getUser();
        if (user) {
            if (!user.loginRole) {
                // This happens if user refreshes the tab before having selected a login role,
                // lets just throw him out.
                this.Session.logout();
                return;
            }
            this.Session.translate$(user.lang).subscribe();
            this.Session.restartSessionCheck();
            this.user = user;
        } else {
            this.Session.switchLanguage('en');
            this.Session.getEnv$().subscribe({
                next: (value: 'DEV' | 'PROD') => {
                    if (value === 'PROD') {
                        this.Session.login$('', '').subscribe((user) => (this.user = user));
                    }
                    this.devLoginRequired = value === 'DEV';
                },
                error: () => console.log('no env found'),
            });
        }
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    setUser(user: User) {
        this.user = user;
    }
}
