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
import { NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ExaminationStatusService } from '../examination-status.service';

@Component({
    selector: 'xm-examination-logout',
    template: `
        <div class="row">
            <div class="col-12">
                <div class="mt-4 mb-4 p-5 bg-body-secondary rounded-3">
                    <div class="container-fluid py-5">
                        <h1 class="display-5 fw-bold">{{ 'i18n_end_of_exam' | translate }}</h1>
                        <p class="fs-4">{{ reasonPhrase | translate }}</p>
                        <a *ngIf="quitLink" [href]="quitLink" class="btn btn-primary btn-lg"
                            >{{ 'i18n_quit_seb' | translate }}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `,
    standalone: true,
    imports: [NgIf, TranslateModule],
})
export class ExaminationLogoutComponent implements OnInit {
    quitLinkEnabled = false;
    reasonPhrase = '';
    quitLink?: string;

    constructor(
        private http: HttpClient,
        private router: Router,
        private route: ActivatedRoute,
        private ExaminationStatus: ExaminationStatusService,
    ) {}

    ngOnInit() {
        this.reasonPhrase =
            this.route.snapshot.queryParamMap.get('reason') === 'aborted' ? 'i18n_exam_aborted' : 'i18n_exam_returned';
        this.quitLinkEnabled = this.route.snapshot.queryParamMap.get('quitLinkEnabled') === 'true';

        if (this.quitLinkEnabled) {
            this.http
                .get<{ quitLink: string }>('/app/settings/examinationQuitLink')
                .subscribe({ next: (resp) => (this.quitLink = resp.quitLink), error: () => this.logout() });
        } else {
            this.logout();
        }
    }

    private logout = () =>
        window.setTimeout(() => {
            this.ExaminationStatus.notifyEndOfExamination();
            this.router.navigate(['/logout']);
        }, 8000);
}
