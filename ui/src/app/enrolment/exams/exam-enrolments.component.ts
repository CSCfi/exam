// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { catchError, forkJoin, of } from 'rxjs';
import type { EnrolmentInfo } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import { ExamSearchResultComponent } from 'src/app/enrolment/search/exam-search-result.component';
import { EnrolmentDetailsComponent } from './exam-enrolment-details.component';

@Component({
    selector: 'xm-exam-enrolments',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (exam()?.noTrialsLeft) {
            <div class="row mt-2 ms-2 me-2">
                <div class="col-md-12 alert-danger">
                    <h1>{{ 'i18n_no_trials_left' | translate }}</h1>
                </div>
            </div>
        }
        @if (exam()) {
            <xm-enrolment-details [exam]="exam()!"></xm-enrolment-details>
        }
        @if (exams().length > 0) {
            <div class="row mt-2 ms-2 me-2">
                <div class="col-12 ms-4">
                    <h2>{{ 'i18n_student_exams' | translate }}</h2>
                </div>
            </div>
            @for (exam of exams(); track exam.id) {
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
export class ExamEnrolmentsComponent {
    exam = signal<EnrolmentInfo | undefined>(undefined);
    exams = signal<EnrolmentInfo[]>([]);

    private route = inject(ActivatedRoute);
    private toast = inject(ToastrService);
    private Enrolment = inject(EnrolmentService);

    constructor() {
        const code = this.route.snapshot.queryParamMap.get('code') || '';
        const id = Number(this.route.snapshot.paramMap.get('id'));

        forkJoin({
            exam: this.Enrolment.getEnrolmentInfo$(code, id).pipe(
                catchError((err) => {
                    this.toast.error(err);
                    return of(undefined);
                }),
            ),
            exams: this.Enrolment.listEnrolments$(code, id).pipe(
                catchError((err) => {
                    this.toast.error(err);
                    return of([]);
                }),
            ),
        }).subscribe(({ exam, exams }) => {
            this.exam.set(exam);
            this.exams.set(exams);
        });
    }
}
