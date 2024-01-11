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
import { DatePipe, NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { Exam } from '../../exam/exam.model';
import { CourseCodeComponent } from '../../shared/miscellaneous/course-code.component';
import { TeacherListComponent } from '../../shared/user/teacher-list.component';
import type { CollaborativeExamInfo, EnrolmentInfo } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';

@Component({
    selector: 'xm-exam-search-result',
    template: `<div
        class="student-enrolment-result-wrapper max-w-1100"
        [ngClass]="exam.alreadyEnrolled && exam.reservationMade ? '' : 'notactive'"
    >
        <div class="row">
            <div class="col">
                <h2 class="student-exam-row-title-blue">
                    @if (!collaborative) {
                        <a
                            class="infolink"
                            [routerLink]="['/enrolments', exam.id]"
                            [queryParams]="{ code: exam.course?.code }"
                        >
                            {{ exam.name }}
                        </a>
                    }
                    @if (collaborative) {
                        <span>{{ exam.name }}</span>
                    }
                </h2>
            </div>
        </div>
        <div class="row mt-1">
            @if (exam.alreadyEnrolled && !exam.reservationMade) {
                <span class="mt-1 student-exam-needs-reservation">
                    {{ 'i18n_state_needs_reservation_title' | translate }}
                </span>
            }
        </div>
        <div class="row mt-3">
            <div class="col-md">
                <span [hidden]="collaborative">{{ 'i18n_course_name' | translate }}:</span>
                @if (!collaborative && exam.course) {
                    <div><xm-course-code [course]="exam.course"></xm-course-code> {{ exam.course.name }}</div>
                }
            </div>
            <div class="col">
                <span [hidden]="collaborative">{{ 'i18n_teachers' | translate }}: </span>
                <span [hidden]="collaborative">
                    <xm-teacher-list [exam]="exam"></xm-teacher-list>
                </span>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col">
                <span>{{ 'i18n_exam_validity' | translate }}: </span>
                <span
                    >{{ exam.periodStart | date: 'dd.MM.yyyy' }} &ndash; {{ exam.periodEnd | date: 'dd.MM.yyyy' }}</span
                >
            </div>
        </div>
        <div class="row mt-3">
            <div class="col">
                <span>{{ 'i18n_exam_language' | translate }}: </span>
                <span>{{ exam.languages.join(', ') }}</span>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col flex justify-content-end">
                @if (!exam.alreadyEnrolled) {
                    <button
                        class="btn btn-success text-nowrap important-clear-focus"
                        (click)="enrollForExam()"
                        [disabled]="enrolling"
                    >
                        {{ 'i18n_enroll_to_exam' | translate }}
                    </button>
                }
                @if (exam.alreadyEnrolled && !exam.reservationMade) {
                    <button class="btn btn-success text-nowrap important-clear-focus" (click)="makeReservation()">
                        {{ 'i18n_student_new_reservation' | translate }}
                    </button>
                }
                @if (exam.alreadyEnrolled && exam.reservationMade) {
                    <span class="student-exam-all-required text-nowrap">{{ 'i18n_enrolled_to_exam' | translate }}</span>
                }
            </div>
        </div>
    </div>`,
    standalone: true,
    imports: [NgClass, RouterLink, CourseCodeComponent, TeacherListComponent, DatePipe, TranslateModule],
})
export class ExamSearchResultComponent {
    @Input() exam!: EnrolmentInfo | CollaborativeExamInfo;
    @Input() collaborative = false;

    enrolling = false; // DO WE NEED THIS?

    constructor(
        private router: Router,
        private Enrolment: EnrolmentService,
    ) {}

    enrollForExam = () => {
        if (this.enrolling) {
            return;
        }
        this.enrolling = true;
        this.Enrolment.checkAndEnroll$(this.exam as Exam, this.collaborative).subscribe(() => (this.enrolling = false));
    };

    makeReservation = () => {
        if (this.exam.implementation !== 'AQUARIUM') {
            this.router.navigate(['/dashboard']);
        } else {
            const path = this.collaborative
                ? ['/calendar', this.exam.id, 'collaborative']
                : ['/calendar', this.exam.id];
            this.router.navigate(path);
        }
    };
}
