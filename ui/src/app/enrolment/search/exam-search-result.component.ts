// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { CollaborativeExamInfo, EnrolmentInfo } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { Exam } from 'src/app/exam/exam.model';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';

@Component({
    selector: 'xm-exam-search-result',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div
        [ngClass]="
            exam().alreadyEnrolled && exam().reservationMade
                ? 'xm-study-item-container'
                : 'xm-study-item-container--inactive'
        "
    >
        <div class="row">
            <div class="col">
                <h2>
                    @if (!collaborative()) {
                        <button
                            class="exam-title-button"
                            [routerLink]="['/enrolments', exam().id]"
                            [queryParams]="{ code: exam().course?.code }"
                        >
                            {{ exam().name }}
                            <img class="arrow_icon" alt="" src="/assets/images/arrow_right.svg" />
                        </button>
                    }
                    @if (collaborative()) {
                        <span class="exam-title-text">{{ exam().name }}</span>
                    }
                </h2>
            </div>
        </div>
        @if (exam().alreadyEnrolled && !exam().reservationMade) {
            <div class="row mt-1">
                <div class="col">
                    <span class="text-danger">
                        {{ 'i18n_state_needs_reservation_title' | translate }}
                    </span>
                </div>
            </div>
        }
        <div class="mt-3">
            @if (!collaborative() && exam().course) {
                <div class="row mb-2">
                    <div class="col-md-3">{{ 'i18n_course_name' | translate }}:</div>
                    <div class="col-md-9">
                        <span [ariaLabel]="'i18n_course_code' | translate">
                            <xm-course-code [course]="exam().course!"></xm-course-code>
                        </span>
                        {{ exam().course?.name }}
                    </div>
                </div>
            }

            <div class="row mb-2">
                <div class="col-md-3">{{ 'i18n_exam_validity' | translate }}:</div>
                <div class="col-md-9">
                    {{ exam().periodStart | date: 'dd.MM.yyyy' }} &ndash; {{ exam().periodEnd | date: 'dd.MM.yyyy' }}
                </div>
            </div>

            @if (!collaborative()) {
                <div class="row mb-2">
                    <div class="col-md-3">{{ 'i18n_teachers' | translate }}:</div>
                    <div class="col-md-9"><xm-teacher-list [exam]="exam()"></xm-teacher-list></div>
                </div>
            }

            <div class="row mb-2">
                <div class="col-md-3">{{ 'i18n_exam_language' | translate }}:</div>
                <div class="col-md-9">{{ exam().languages.join(', ') }}</div>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col">
                @if (!exam().alreadyEnrolled) {
                    <button class="btn btn-success" (click)="enrollForExam()" [disabled]="enrolling()">
                        {{ 'i18n_enroll_to_exam' | translate }}
                    </button>
                }
                @if (exam().alreadyEnrolled && !exam().reservationMade) {
                    <button class="btn btn-success" (click)="makeReservation()">
                        {{ 'i18n_student_new_reservation' | translate }}
                    </button>
                }
                @if (exam().alreadyEnrolled && exam().reservationMade) {
                    <span class="student-exam-all-required">{{ 'i18n_enrolled_to_exam' | translate }}</span>
                }
            </div>
        </div>
    </div>`,
    styleUrls: ['./exam-search.component.scss', '../enrolment.shared.scss'],
    imports: [NgClass, RouterLink, CourseCodeComponent, TeacherListComponent, DatePipe, TranslateModule],
})
export class ExamSearchResultComponent {
    exam = input.required<EnrolmentInfo | CollaborativeExamInfo>();
    collaborative = input(false);

    enrolling = signal(false);

    private router = inject(Router);
    private Enrolment = inject(EnrolmentService);

    enrollForExam() {
        if (this.enrolling()) {
            return;
        }
        this.enrolling.set(true);
        this.Enrolment.checkAndEnroll$(this.exam() as Exam, this.collaborative()).subscribe(() =>
            this.enrolling.set(false),
        );
    }

    makeReservation() {
        const exam = this.exam();
        if (exam.implementation !== 'AQUARIUM') {
            this.router.navigate(['/dashboard']);
        } else {
            const path = this.collaborative() ? ['/calendar', exam.id, 'collaborative'] : ['/calendar', exam.id];
            this.router.navigate(path);
        }
    }
}
