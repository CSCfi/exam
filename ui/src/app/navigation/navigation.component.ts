// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { ExaminationStatusService } from 'src/app/examination/examination-status.service';
import type { User } from 'src/app/session/session.model';
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
    links = signal<Link[]>([]);
    mobileMenuOpen = signal(false);
    user = signal<User | undefined>(undefined);
    stateInitialized = signal(false);

    private toast = inject(ToastrService);
    private Navigation = inject(NavigationService);
    private Session = inject(SessionService);
    private ExaminationStatus = inject(ExaminationStatusService);

    constructor() {
        const currentUser = this.Session.getUser();
        this.user.set(currentUser);

        // React to examination status changes using signals
        effect(() => {
            this.ExaminationStatus.examinationStartingSignal();
            this.getLinks(false, false);
        });

        effect(() => {
            this.ExaminationStatus.upcomingExamSignal();
            this.getLinks(false, false);
        });

        effect(() => {
            this.ExaminationStatus.wrongLocationSignal();
            this.getLinks(false, false);
        });

        effect(() => {
            this.ExaminationStatus.aquariumLoggedInSignal();
            this.getLinks(false, false);
        });

        // Note: Session.userChange$ is still an observable - would need SessionService migration
        this.Session.userChange$.subscribe((user) => {
            this.user.set(user);
            this.getLinks(true);
        });

        // Initialize links based on user
        if (currentUser?.isAdmin) {
            this.Navigation.getAppVersion$().subscribe({
                next: (resp) => this.appVersion.set(resp.appVersion),
                error: (err) => this.toast.error(err),
            });
            this.getLinks(true, true);
        } else if (currentUser) {
            this.getLinks(true);
        } else {
            this.getLinks(false);
        }
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

    private getLinks(checkInteroperability: boolean, checkByod = false) {
        if (!checkInteroperability && !checkByod) {
            this.links.set(this.Navigation.getLinks(false, false));
            return;
        }
        const interoperability$ = checkInteroperability
            ? this.Navigation.getInteroperability$()
            : of({ isExamCollaborationSupported: false });

        const byod$ = checkByod
            ? this.Navigation.getByodSupport$()
            : of({ sebExaminationSupported: false, homeExaminationSupported: false });

        forkJoin([interoperability$, byod$]).subscribe({
            next: ([iop, byod]) =>
                this.links.set(
                    this.Navigation.getLinks(
                        iop.isExamCollaborationSupported,
                        byod.sebExaminationSupported || byod.homeExaminationSupported,
                    ),
                ),
            error: (err) => this.toast.error(err),
        });
    }
}
