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
import { Component, OnInit } from '@angular/core';

import { ExamEnrolment } from '../../enrolment/enrolment.model';
import { EnrolmentService } from '../../enrolment/enrolment.service';
import { Exam } from '../../exam/exam.model';
import { ReservationService } from '../../reservation/reservation.service';
import { SessionService } from '../../session/session.service';
import { DateTimeService } from '../../utility/date/date.service';
import { DashboardEnrolment, StudentDashboardService } from './studentDashboard.service';

@Component({
    selector: 'student-dashboard',
    template: require('./studentDashboard.component.html'),
})
export class StudentDashboardComponent implements OnInit {
    userEnrolments: DashboardEnrolment[];

    constructor(
        private StudentDashboard: StudentDashboardService,
        private Reservation: ReservationService,
        private DateTime: DateTimeService,
        private Enrolment: EnrolmentService,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        this.StudentDashboard.listEnrolments().subscribe(
            data => (this.userEnrolments = data),
            err => console.error(err),
        );
    }

    printExamDuration = (exam: Exam) => this.DateTime.printExamDuration(exam);

    removeReservation = (enrolment: ExamEnrolment) => this.Reservation.removeReservation(enrolment);

    addEnrolmentInformation = (enrolment: ExamEnrolment) => this.Enrolment.addEnrolmentInformation(enrolment);

    getUsername = (): string => this.Session.getUserName();

    enrolmentRemoved = (data: DashboardEnrolment) => this.userEnrolments.splice(this.userEnrolments.indexOf(data), 1);

    removeEnrolment = (enrolment: ExamEnrolment) => this.Enrolment.removeEnrolment(enrolment);
}
