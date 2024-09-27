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

import { Component, Input } from '@angular/core';
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
    standalone: true,
    imports: [CourseCodeComponent, MathJaxDirective, TranslateModule],
    styleUrls: ['../examination.shared.scss'],
})
export class AnswerInstructionsComponent {
    @Input() exam!: Examination;

    constructor(private DateTime: DateTimeService) {}

    printExamDuration = () => this.DateTime.printExamDuration(this.exam);
}
