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
import { Router } from '@angular/router';
import type { Exam } from '../../exam/exam.model';
import type { CollaborativeExamInfo, EnrolmentInfo } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';

@Component({
    selector: 'xm-exam-search-result',
    template: `<div
        class="student-enrolment-result-wrapper max-w-1100 container"
        [ngClass]="exam.alreadyEnrolled && exam.reservationMade ? '' : 'notactive'"
    >
        <div class="row">
            <div class="col">
                <span class="student-exam-row-title-blue">
                    <a
                        *ngIf="!collaborative"
                        class="infolink"
                        [routerLink]="['/enrolments', exam.id]"
                        [queryParams]="{ code: exam.course?.code }"
                    >
                        {{ exam.name }}
                    </a>
                    <span *ngIf="collaborative">{{ exam.name }}</span>
                </span>
            </div>
        </div>
        <div class="row mt-1">
            <span *ngIf="exam.alreadyEnrolled && !exam.reservationMade" class="mt-1 student-exam-needs-reservation">
                {{ 'sitnet_state_needs_reservation_title' | translate }}
            </span>
        </div>
        <div class="row mt-3">
            <div class="col-md">
                <span [hidden]="collaborative">{{ 'sitnet_course_name' | translate }}:</span>
                <div *ngIf="!collaborative && exam.course">
                    <xm-course-code [course]="exam.course"></xm-course-code> {{ exam.course.name }}
                </div>
            </div>
            <div class="col">
                <span [hidden]="collaborative">{{ 'sitnet_teachers' | translate }}: </span>
                <span [hidden]="collaborative">
                    <xm-teacher-list [exam]="exam"></xm-teacher-list>
                </span>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col">
                <span>{{ 'sitnet_exam_validity' | translate }}: </span>
                <span
                    >{{ exam.examActiveStartDate | date: 'dd.MM.yyyy' }} &ndash;
                    {{ exam.examActiveEndDate | date: 'dd.MM.yyyy' }}</span
                >
            </div>
        </div>
        <div class="row mt-3">
            <div class="col">
                <span>{{ 'sitnet_exam_language' | translate }}: </span>
                <span>{{ exam.languages.join(', ') }}</span>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col flex justify-content-end">
                <button
                    class="btn btn-success text-nowrap"
                    (click)="enrollForExam()"
                    *ngIf="!exam.alreadyEnrolled"
                    [disabled]="enrolling"
                >
                    {{ 'sitnet_enroll_to_exam' | translate }}
                </button>
                <button
                    class="btn btn-success text-nowrap"
                    (click)="makeReservation()"
                    *ngIf="exam.alreadyEnrolled && !exam.reservationMade"
                >
                    {{ 'sitnet_student_new_reservation' | translate }}
                </button>
                <span
                    class="student-exam-all-required text-nowrap"
                    *ngIf="exam.alreadyEnrolled && exam.reservationMade"
                    >{{ 'sitnet_enrolled_to_exam' | translate }}</span
                >
            </div>
        </div>
    </div> `,
})
export class ExamSearchResultComponent {
    @Input() exam!: EnrolmentInfo | CollaborativeExamInfo;
    @Input() collaborative = false;

    enrolling = false; // DO WE NEED THIS?

    constructor(private router: Router, private Enrolment: EnrolmentService) {}

    enrollForExam = () => {
        if (this.enrolling) {
            return;
        }
        this.enrolling = true;
        this.Enrolment.checkAndEnroll$(this.exam as Exam, this.collaborative).subscribe(() => (this.enrolling = false));
    };

    makeReservation = () => {
        const params = this.exam.id;
        const fragments = '/calendar';
        this.router.navigate([fragments, params]);
    };
}
