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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { StateService } from '@uirouter/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as toastr from 'toastr';

import { ExaminationStatusService } from '../examination/examinationStatus.service';
import { SessionService, User } from '../session/session.service';
import { Link, NavigationService } from './navigation.service';

@Component({
    selector: 'navigation',
    templateUrl: './navigation.component.html',
})
export class NavigationComponent implements OnInit, OnDestroy {
    appVersion: string;
    links: Link[];
    mobileMenuOpen: boolean;
    user: User;
    isInteroperable: boolean;
    private ngUnsubscribe = new Subject();

    constructor(
        private state: StateService,
        private Navigation: NavigationService,
        private Session: SessionService,
        private ExaminationStatus: ExaminationStatusService,
    ) {
        this.ExaminationStatus.examinationStarting$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
            this.getLinks(false);
        });
        this.ExaminationStatus.wrongLocation$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
            this.getLinks(false);
        });
        this.Session.userChange$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((user: User) => {
            this.user = user;
            this.getLinks(true);
        });
    }

    ngOnInit() {
        this.user = this.Session.getUser();
        if (this.user && this.user.isAdmin) {
            this.Navigation.getAppVersion().subscribe(
                resp => (this.appVersion = resp.appVersion),
                e => toastr.error(e),
            );
            this.getLinks(true);
        } else if (this.user) {
            this.getLinks(true);
        } else {
            this.getLinks(false);
        }
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    isActive = (link: Link): boolean => link.state === this.state.current.name;

    openMenu = () => (this.mobileMenuOpen = !this.mobileMenuOpen);

    switchLanguage = (key: string) => this.Session.switchLanguage(key);

    private getLinks = (checkInteroperability: boolean) => {
        if (checkInteroperability) {
            this.Navigation.getInteroperability().subscribe(
                resp => {
                    this.isInteroperable = resp.isExamCollaborationSupported;
                    this.links = this.Navigation.getLinks(this.isInteroperable);
                },
                e => toastr.error(e),
            );
        } else {
            this.links = this.Navigation.getLinks(false);
        }
    };
}
