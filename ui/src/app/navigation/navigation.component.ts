/*
 * Copyright (c) 2019 Exam Consortium
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

import type { OnDestroy, OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ExaminationStatusService } from 'src/app/examination/examination-status.service';
import type { User } from 'src/app/session/session.service';
import { SessionService } from 'src/app/session/session.service';
import type { Link } from './navigation.service';
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
    private ngUnsubscribe = new Subject();

    constructor(
        private toast: ToastrService,
        private Navigation: NavigationService,
        private Session: SessionService,
        private ExaminationStatus: ExaminationStatusService,
    ) {
        this.user = this.Session.getUser();
        this.ExaminationStatus.examinationStarting$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
            this.getLinks(false);
        });
        this.ExaminationStatus.upcomingExam$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => this.getLinks(false));
        this.ExaminationStatus.wrongLocation$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
            this.getLinks(false);
        });
        this.Session.userChange$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((user: User | undefined) => {
            this.user = user;
            this.getLinks(true);
        });
    }

    ngOnInit() {
        this.user = this.Session.getUser();
        if (this.user && this.user.isAdmin) {
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

    isActive(link: Link): boolean {
        return window.location.href.includes(link.route);
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    getSkipLinkPath = (skipTarget: string) => {
        return window.location.toString().includes(skipTarget) ? window.location : window.location + skipTarget;
    };

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
