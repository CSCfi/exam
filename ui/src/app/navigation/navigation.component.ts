// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnDestroy, OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
})
export class NavigationComponent implements OnInit, OnDestroy {
    appVersion = '';
    links: Link[] = [];
    mobileMenuOpen = false;
    user?: User;
    stateInitialized = false;

    private toast = inject(ToastrService);
    private Navigation = inject(NavigationService);
    private Session = inject(SessionService);
    private ExaminationStatus = inject(ExaminationStatusService);

    private ngUnsubscribe = new Subject();

    constructor() {
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
        this.Session.userChange$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((user) => {
            this.user = user;
            this.getLinks(true);
        });
    }

    ngOnInit() {
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
        if (!checkInteroperability && !checkByod) {
            this.links = this.Navigation.getLinks(false, false);
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
                (this.links = this.Navigation.getLinks(
                    iop.isExamCollaborationSupported,
                    byod.sebExaminationSupported || byod.homeExaminationSupported,
                )),
            error: (err) => this.toast.error(err),
        });
    };
}
