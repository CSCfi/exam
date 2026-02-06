// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { EnrolmentInfo } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import { ExamSearchResultComponent } from 'src/app/enrolment/search/exam-search-result.component';
import { SessionService } from 'src/app/session/session.service';
import { EnrolmentDetailsComponent } from './exam-enrolment-details.component';

@Component({
    selector: 'xm-exam-enrolments',
    template: `
        @if (exam?.noTrialsLeft) {
            <div class="row mt-2 ms-2 me-2">
                <div class="col-md-12 alert-danger">
                    <h1>{{ 'i18n_no_trials_left' | translate }}</h1>
                </div>
            </div>
        }
        @if (exam) {
            <xm-enrolment-details [exam]="exam"></xm-enrolment-details>
        }
        @if (exams.length > 0) {
            <div class="row mt-2 ms-2 me-2">
                <div class="col-12 ms-4">
                    <h2>{{ 'i18n_student_exams' | translate }}</h2>
                </div>
            </div>
            @for (exam of exams; track exam) {
                <div class="row mt-2 ms-4 me-4 ">
                    <div class="col-12 ms-2">
                        <xm-exam-search-result [exam]="exam"></xm-exam-search-result>
                    </div>
                </div>
            }
        }
    `,
    imports: [EnrolmentDetailsComponent, ExamSearchResultComponent, TranslateModule],
})
export class ExamEnrolmentsComponent implements OnInit {
    exam!: EnrolmentInfo;
    exams: EnrolmentInfo[] = [];
    code = '';

    private route = inject(ActivatedRoute);
    private toast = inject(ToastrService);
    private Enrolment = inject(EnrolmentService);
    private Session = inject(SessionService);

    ngOnInit() {
        const user = this.Session.getUser();
        if (!user.loginRole) {
            // We can not load resources before role is known.
            return;
        }
        const code = this.route.snapshot.queryParamMap.get('code') || '';
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.Enrolment.getEnrolmentInfo$(code, id).subscribe({
            next: (exam) => (this.exam = exam),
            error: (err) => this.toast.error(err),
        });
        this.Enrolment.listEnrolments$(code, id).subscribe({
            next: (exams) => (this.exams = exams),
            error: (err) => this.toast.error(err),
        });
    }
}
