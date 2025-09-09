// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { Examination } from 'src/app/examination/examination.model';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';

@Component({
    selector: 'xm-answer-instructions',
    template: `
        <!-- ANSWER INSTRUCTIONS -->
        <div class="row mt-3 ms-1">
            <div class="col-md-12">
                <h2 class="exam-title" aria-live="polite" id="examination-section">
                    {{ 'i18n_exam_guide' | translate }}
                </h2>
            </div>
        </div>
        <div class="row ms-3 guide-wrapper">
            <div class="col-md-12">
                @if (exam.course) {
                    <div class="row">
                        <div class="header col-md-4">{{ 'i18n_course_name' | translate }}:</div>
                        <div class="text col-md-8">{{ exam.course.name }}</div>
                    </div>
                }
                @if (exam.course) {
                    <div class="row">
                        <div class="header col-md-4">{{ 'i18n_course_code' | translate }}:</div>
                        <div class="text col-md-8"><xm-course-code [course]="exam.course"></xm-course-code></div>
                    </div>
                }
                <div class="row">
                    <div class="header col-md-4">{{ 'i18n_exam_name' | translate }}:</div>
                    <div class="text col-md-8">{{ exam.name }}</div>
                </div>
                <div class="row">
                    <div class="header col-md-4">{{ 'i18n_exam_duration' | translate }}:</div>
                    <div class="text col-md-8">{{ printExamDuration() }}</div>
                </div>
                <div class="row">
                    <div class="header col-md-4">{{ 'i18n_exam_guide' | translate }}:</div>
                    <div class="text col-md-8" [xmMathJax]="exam.instruction"></div>
                </div>
            </div>
        </div>
    `,
    imports: [CourseCodeComponent, MathJaxDirective, TranslateModule],
    styleUrls: ['../examination.shared.scss'],
})
export class AnswerInstructionsComponent {
    @Input() exam!: Examination;

    private DateTime = inject(DateTimeService);

    printExamDuration = () => this.DateTime.printExamDuration(this.exam);
}
