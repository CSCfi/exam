// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeFi from '@angular/common/locales/fi';
import localeSv from '@angular/common/locales/sv';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ExaminationStatusService } from './examination/examination-status.service';
import { NavigationComponent } from './navigation/navigation.component';
import { DevLoginComponent } from './session/dev/dev-login.component';
import type { User } from './session/session.model';
import { SessionService } from './session/session.service';

@Component({
    selector: 'xm-app',
    template: `
        @if (!user && devLoginRequired()) {
            <xm-dev-login (loggedIn)="setUser($event)"></xm-dev-login>
        }
        @if (user) {
            <xm-navigation [hidden]="hideNavBar()"></xm-navigation>
            <main id="mainView" class="container-fluid" [ngClass]="{ 'vmenu-on': !hideNavBar() }">
                <router-outlet></router-outlet>
            </main>
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
    imports: [DevLoginComponent, NavigationComponent, NgClass, RouterOutlet],
})
export class AppComponent implements OnInit {
    user?: User;
    hideNavBar = signal(false);
    devLoginRequired = signal(false);

    private router = inject(Router);
    private Session = inject(SessionService);
    private ExaminationStatus = inject(ExaminationStatusService);

    constructor() {
        registerLocaleData(localeSv);
        registerLocaleData(localeFi);
        registerLocaleData(localeEn);

        // React to examination status changes using signals
        effect(() => {
            this.ExaminationStatus.examinationStartingSignal();
            this.hideNavBar.set(true);
        });

        effect(() => {
            this.ExaminationStatus.examinationEndingSignal();
            this.hideNavBar.set(false);
        });

        // React to dev logout signal
        effect(() => {
            if (this.Session.devLogoutChangeSignal()) {
                delete this.user;
                this.router.navigate(['']);
            }
        });
    }

    ngOnInit() {
        const user = this.Session.getOptionalUser();
        if (user) {
            if (!user.loginRole) {
                // This happens if user refreshes the tab before having selected a login role,
                // lets just throw him out.
                this.Session.logout();
                return;
            }
            this.Session.translate$(user.lang).subscribe();
            this.Session.restartSessionCheck();
            // Load course code prefix if not already loaded (e.g., after page refresh)
            this.Session.loadCourseCodePrefix$().subscribe();
            this.user = user;
        } else {
            this.Session.switchLanguage('en');
            this.Session.getEnv$().subscribe({
                next: (value: 'DEV' | 'PROD') => {
                    if (value === 'PROD') {
                        this.Session.login$('', '').subscribe((user) => (this.user = user));
                    }
                    this.devLoginRequired.set(value === 'DEV');
                },
                error: () => console.log('no env found'),
            });
        }
    }

    setUser(user: User) {
        this.user = user;
    }
}
