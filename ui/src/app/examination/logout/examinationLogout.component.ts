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
import { Component } from '@angular/core';
import { StateService } from '@uirouter/core';

import { WindowRef } from '../../utility/window/window.service';
import { ExaminationStatusService } from '../examinationStatus.service';

@Component({
    selector: 'examination-logout',
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
export class ExaminationLogoutComponent {
    quitLinkEnabled: boolean;
    reasonPhrase: string;
    quitLink?: string;

    constructor(
        private http: HttpClient,
        private state: StateService,
        private Window: WindowRef,
        private ExaminationStatus: ExaminationStatusService,
    ) {}

    private logout = () =>
        this.Window.nativeWindow.setTimeout(() => {
            this.ExaminationStatus.notifyEndOfExamination();
            this.state.go('logout');
        }, 8000);

    ngOnInit() {
        this.reasonPhrase = this.state.params.reason === 'aborted' ? 'sitnet_exam_aborted' : 'sitnet_exam_returned';
        this.quitLinkEnabled = this.state.params.quitLinkEnabled === 'true';

        if (this.quitLinkEnabled) {
            this.http.get<{ quitLink: string }>('/app/settings/examinationQuitLink').subscribe(
                (resp) => (this.quitLink = resp.quitLink),
                () =>
                    // Fetching quit link failed for some reason, just log out
                    () => this.logout(),
            );
        } else {
            this.logout();
        }
    }
}
