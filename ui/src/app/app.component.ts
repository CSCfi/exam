// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeFi from '@angular/common/locales/fi';
import localeSv from '@angular/common/locales/sv';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { ExaminationStatusService } from './examination/examination-status.service';
import { NavigationComponent } from './navigation/navigation.component';
import { DevLoginComponent } from './session/dev/dev-login.component';
import type { User } from './session/session.model';
import { SessionService } from './session/session.service';

@Component({
    selector: 'xm-app',
    template: `
        @if (initializing()) {
            <div class="app-initializing" aria-live="polite">{{ 'i18n_loading' | translate }}</div>
        }
        @if (!initializing() && !user() && devLoginRequired()) {
            <xm-dev-login (loggedIn)="setUser($event)"></xm-dev-login>
        }
        @if (user()) {
            <xm-navigation [hidden]="hideNavBar()"></xm-navigation>
            <main id="mainView" class="container-fluid" [class.vmenu-on]="!hideNavBar()">
                <router-outlet></router-outlet>
            </main>
        }
    `,
    styles: [
        `
            .app-initializing {
                padding: 2rem;
                text-align: center;
            }
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
    imports: [DevLoginComponent, NavigationComponent, RouterOutlet, TranslateModule],
})
export class AppComponent implements OnInit {
    readonly hideNavBar = computed(() => {
        const starting = this.ExaminationStatus.examinationStartingSignal();
        const ending = this.ExaminationStatus.examinationEndingSignal();
        if (starting === undefined) return false;
        if (ending === undefined) return true;
        return starting > ending;
    });
    readonly devLoginRequired = signal(false);
    readonly initializing = signal(true);
    readonly user = signal<User | undefined>(undefined);

    private readonly router = inject(Router);
    private readonly Session = inject(SessionService);
    private readonly ExaminationStatus = inject(ExaminationStatusService);

    constructor() {
        registerLocaleData(localeSv);
        registerLocaleData(localeFi);
        registerLocaleData(localeEn);

        toObservable(this.Session.devLogoutChange)
            .pipe(filter(Boolean), takeUntilDestroyed())
            .subscribe(() => {
                this.user.set(undefined);
                this.router.navigate(['']);
            });
    }

    ngOnInit() {
        const user = this.Session.getOptionalUser();
        if (user) {
            this.initializing.set(false);
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
            this.user.set(user);
        } else {
            this.Session.switchLanguage('en');
            this.Session.getEnv$().subscribe({
                next: (value: 'DEV' | 'PROD') => {
                    if (value === 'PROD') {
                        this.tryProdLogin();
                    } else {
                        this.devLoginRequired.set(true);
                        this.initializing.set(false);
                    }
                },
                error: () => {
                    console.log('no env found');
                    this.initializing.set(false);
                },
            });
        }
    }

    setUser(user: User) {
        this.user.set(user);
    }

    /**
     * Try PROD (SSO) login. Retries once after a short delay to handle Shibboleth/session
     * timing on initial load (first request may run before the IdP session is fully established).
     */
    private tryProdLogin(retry = false) {
        this.Session.login$('', '').subscribe({
            next: (user) => {
                this.user.set(user);
                this.initializing.set(false);
            },
            error: () => {
                if (!retry) {
                    setTimeout(() => this.tryProdLogin(true), 800);
                } else {
                    this.initializing.set(false);
                }
            },
        });
    }
}
