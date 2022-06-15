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
import { DateTimeService } from '../../shared/date/date.service';
import { CommonExamService } from '../../shared/miscellaneous/common-exam.service';
import type { EnrolmentInfo } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';

@Component({
    selector: 'xm-enrolment-details',
    templateUrl: './exam-enrolment-details.component.html',
})
export class EnrolmentDetailsComponent {
    @Input() exam!: EnrolmentInfo;

    constructor(
        private router: Router,
        private Exam: CommonExamService,
        private Enrolment: EnrolmentService,
        private DateTime: DateTimeService,
    ) {}
    getExpiration = (): boolean => {
        return new Date(this.exam.examActiveEndDate || 0) < new Date();
    };

    enrollForExam = () => this.Enrolment.checkAndEnroll$(this.exam).subscribe();

    translateExamType = () => this.Exam.getExamTypeDisplayName(this.exam.examType.type);

    translateGradeScale = () =>
        this.Exam.getScaleDisplayName(
            this.exam.gradeScale || (this.exam.course ? this.exam.course.gradeScale : undefined),
        );

    printExamDuration = () => this.DateTime.printExamDuration(this.exam);

    makeReservation = () => {
        if (this.exam.implementation !== 'AQUARIUM') {
            this.router.navigate(['dashboard']);
        } else {
            this.router.navigate(['calendar', this.exam.id]);
        }
    };
}
