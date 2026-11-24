// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';
import type { EnrolmentInfo } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import { ExamSearchResultComponent } from 'src/app/enrolment/search/exam-search-result.component';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { EnrolmentDetailsComponent } from './exam-enrolment-details.component';

@Component({
    selector: 'xm-exam-enrolments',
    template: `
        <div class="xm-stack">
            @if (exam()?.noTrialsLeft) {
                <div class="alert-danger">
                    <h1>{{ 'i18n_no_trials_left' | translate }}</h1>
                </div>
            }
            @if (exam()) {
                <xm-enrolment-details [exam]="exam()!"></xm-enrolment-details>
            }
            @if (exams().length > 0) {
                <h2>{{ 'i18n_student_exams' | translate }}</h2>
                @for (exam of exams(); track exam.id) {
                    <xm-exam-search-result [exam]="exam"></xm-exam-search-result>
                }
            }
        </div>
    `,
    imports: [EnrolmentDetailsComponent, ExamSearchResultComponent, TranslateModule],
})
export class ExamEnrolmentsComponent {
    readonly exam = signal<EnrolmentInfo | undefined>(undefined);
    readonly exams = signal<EnrolmentInfo[]>([]);

    private readonly route = inject(ActivatedRoute);
    private readonly toast = inject(ToastService);
    private readonly Enrolment = inject(EnrolmentService);

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
