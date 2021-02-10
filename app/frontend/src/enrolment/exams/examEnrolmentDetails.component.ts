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
import { StateService } from '@uirouter/core';

import { ExamService } from '../../exam/exam.service';
import { DateTimeService } from '../../utility/date/date.service';
import { EnrolmentInfo } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';

@Component({
    selector: 'enrolment-details',
    templateUrl: './examEnrolmentDetails.component.html',
})
export class EnrolmentDetailsComponent {
    @Input() exam: EnrolmentInfo;

    constructor(
        private state: StateService,
        private Exam: ExamService,
        private Enrolment: EnrolmentService,
        private DateTime: DateTimeService,
    ) {}

    enrollForExam = () => this.Enrolment.checkAndEnroll(this.exam);

    translateExamType = () => this.Exam.getExamTypeDisplayName(this.exam.examType.type);

    translateGradeScale = () =>
        this.Exam.getScaleDisplayName(this.exam.gradeScale || (this.exam.course ? this.exam.course.gradeScale : null));

    printExamDuration = () => this.DateTime.printExamDuration(this.exam);

    makeReservation = () => {
        if (this.exam.implementation !== 'AQUARIUM') {
            this.state.go('dashboard');
        } else {
            this.state.go('calendar', { id: this.exam.id });
        }
    };
}