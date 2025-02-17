// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnDestroy, OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ExaminationStatusService } from 'src/app/examination/examination-status.service';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import type { Link } from './navigation.model';
import { NavigationService } from './navigation.service';

@Component({
    selector: 'xm-navigation',
    templateUrl: './navigation.component.html',
    standalone: true,
    imports: [RouterLinkActive, RouterLink, NgbCollapse, TranslateModule],
    styleUrl: './navigation.component.scss',
})
export class NavigationComponent implements OnInit, OnDestroy {
    appVersion = '';
    links: Link[] = [];
    mobileMenuOpen = false;
    user?: User;
    stateInitialized = false;
    private ngUnsubscribe = new Subject();

    constructor(
        private toast: ToastrService,
        private Navigation: NavigationService,
        private Session: SessionService,
        private ExaminationStatus: ExaminationStatusService,
    ) {
        this.user = this.Session.getUser();
        this.ExaminationStatus.examinationStarting$
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(() => this.getLinks(false, false));
        this.ExaminationStatus.upcomingExam$
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(() => this.getLinks(false, false));
        this.ExaminationStatus.wrongLocation$
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(() => this.getLinks(false, false));
        this.ExaminationStatus.aquariumLoggedIn$
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(() => this.getLinks(false, false));
        this.Session.userChange$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((user: User | undefined) => {
            this.user = user;
            this.getLinks(true);
        });
    }

    ngOnInit() {
        // Add a small timeout because there is some race condition/view update problem with initial link
        // loading if there is an examination starting or started. To be fixed properly if solution found.
        window.setTimeout(() => {
            this.user = this.Session.getUser();
            if (this.user?.isAdmin) {
                this.Navigation.getAppVersion$().subscribe({
                    next: (resp) => (this.appVersion = resp.appVersion),
                    error: (err) => this.toast.error(err),
                });
                this.getLinks(true, true);
            } else if (this.user) {
                this.getLinks(true);
            } else {
                this.getLinks(false);
            }
        }, 200);
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    isActive = (link: Link) => window.location.href.includes(link.route);

    getSkipLinkPath = (skipTarget: string) =>
        window.location.toString().includes(skipTarget) ? window.location : window.location + skipTarget;

    openMenu = () => (this.mobileMenuOpen = !this.mobileMenuOpen);

    switchLanguage = (key: string) => this.Session.switchLanguage(key);

    private getLinks = (checkInteroperability: boolean, checkByod = false) => {
        if (checkInteroperability && checkByod) {
            forkJoin([this.Navigation.getInteroperability$(), this.Navigation.getByodSupport$()]).subscribe({
                next: ([iop, byod]) =>
                    (this.links = this.Navigation.getLinks(
                        iop.isExamCollaborationSupported,
                        byod.sebExaminationSupported || byod.homeExaminationSupported,
                    )),
                error: (err) => this.toast.error(err),
            });
        } else if (checkInteroperability) {
            this.Navigation.getInteroperability$().subscribe({
                next: (resp) => (this.links = this.Navigation.getLinks(resp.isExamCollaborationSupported, false)),
                error: (err) => this.toast.error(err),
            });
        } else {
            this.links = this.Navigation.getLinks(false, false);
        }
    };
}
