// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { ExaminationStatusService } from 'src/app/examination/examination-status.service';
import { SessionService } from 'src/app/session/session.service';
import type { Link } from './navigation.model';
import { NavigationService } from './navigation.service';

@Component({
    selector: 'xm-navigation',
    templateUrl: './navigation.component.html',
    imports: [RouterLinkActive, RouterLink, NgbCollapse, TranslateModule],
    styleUrl: './navigation.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationComponent {
    appVersion = signal('');
    mobileMenuOpen = signal(false);
    featureFlags = signal({ iop: false, byod: false });

    links = computed(() => {
        // Track a bunch of signals to establish reactive dependencies
        this.user();
        this.ExaminationStatus.combinedStatusSignal();
        const { iop, byod } = this.featureFlags();
        return this.Navigation.getLinks(iop, byod);
    });

    private toast = inject(ToastrService);
    private Navigation = inject(NavigationService);
    private Session = inject(SessionService);
    private ExaminationStatus = inject(ExaminationStatusService);

    constructor() {
        // Load app version for admins
        const currentUser = this.user();
        if (currentUser?.isAdmin) {
            this.Navigation.getAppVersion$().subscribe({
                next: (resp) => this.appVersion.set(resp.appVersion),
                error: (err) => this.toast.error(err),
            });
        }

        // Load feature flags if user exists (links computed will react to user changes)
        if (currentUser) {
            this.loadLinksWithFeatures(true, currentUser.isAdmin);
        }
    }

    // Use SessionService's user signal directly
    get user() {
        return this.Session.userChangeSignal;
    }

    isActive(link: Link) {
        return window.location.href.includes(link.route);
    }

    getSkipLinkPath(skipTarget: string) {
        return window.location.toString().includes(skipTarget) ? window.location : window.location + skipTarget;
    }

    openMenu() {
        this.mobileMenuOpen.update((v) => !v);
    }

    switchLanguage(key: string) {
        this.Session.switchLanguage(key);
    }

    private loadLinksWithFeatures(checkInteroperability: boolean, checkByod = false) {
        if (!checkInteroperability && !checkByod) return;

        const interoperability$ = checkInteroperability
            ? this.Navigation.getInteroperability$()
            : of({ isExamCollaborationSupported: false });

        const byod$ = checkByod
            ? this.Navigation.getByodSupport$()
            : of({ sebExaminationSupported: false, homeExaminationSupported: false });

        forkJoin([interoperability$, byod$]).subscribe({
            next: ([iop, byod]) => {
                this.featureFlags.set({
                    iop: iop.isExamCollaborationSupported,
                    byod: byod.sebExaminationSupported || byod.homeExaminationSupported,
                });
            },
            error: (err) => this.toast.error(err),
        });
    }
}
