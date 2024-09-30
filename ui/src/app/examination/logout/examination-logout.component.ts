// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ExaminationStatusService } from 'src/app/examination/examination-status.service';

@Component({
    selector: 'xm-examination-logout',
    template: `
        <div class="row">
            <div class="col-12">
                <div class="mt-4 mb-4 p-5 bg-body-secondary rounded-3">
                    <div class="container-fluid py-5">
                        <h1 class="display-5 fw-bold">{{ 'i18n_end_of_exam' | translate }}</h1>
                        <p class="fs-4" aria-live="polite">{{ reasonPhrase | translate }}</p>
                        @if (quitLink) {
                            <a [href]="quitLink" class="btn btn-primary btn-lg">{{ 'i18n_quit_seb' | translate }} </a>
                        }
                    </div>
                </div>
            </div>
        </div>
    `,
    standalone: true,
    imports: [TranslateModule],
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
