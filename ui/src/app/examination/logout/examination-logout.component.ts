/*
 * Copyright (c) 2017 Exam Consortium
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
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UIRouterGlobals } from '@uirouter/core';
import { WindowRef } from '../../shared/window/window.service';
import { ExaminationStatusService } from '../examination-status.service';

@Component({
    selector: 'xm-examination-logout',
    template: `
        <div class="jumbotron">
            <h1>{{ 'sitnet_end_of_exam' | translate }}</h1>
            <h2>
                {{ reasonPhrase | translate }}
            </h2>
            <h3>
                <u>
                    <a *ngIf="quitLink" [href]="quitLink">{{ 'sitnet_quit_seb' | translate }}</a>
                </u>
            </h3>
        </div>
    `,
})
export class ExaminationLogoutComponent implements OnInit {
    quitLinkEnabled = false;
    reasonPhrase = '';
    quitLink?: string;

    constructor(
        private http: HttpClient,
        private router: Router,
        private routing: UIRouterGlobals,
        private Window: WindowRef,
        private ExaminationStatus: ExaminationStatusService,
    ) {}

    ngOnInit() {
        this.reasonPhrase = this.routing.params.reason === 'aborted' ? 'sitnet_exam_aborted' : 'sitnet_exam_returned';
        this.quitLinkEnabled = this.routing.params.quitLinkEnabled === 'true';

        if (this.quitLinkEnabled) {
            this.http
                .get<{ quitLink: string }>('/app/settings/examinationQuitLink')
                .subscribe({ next: (resp) => (this.quitLink = resp.quitLink), error: () => this.logout() });
        } else {
            this.logout();
        }
    }

    private logout = () =>
        this.Window.nativeWindow.setTimeout(() => {
            this.ExaminationStatus.notifyEndOfExamination();
            this.router.navigate(['logout']);
        }, 8000);
}
