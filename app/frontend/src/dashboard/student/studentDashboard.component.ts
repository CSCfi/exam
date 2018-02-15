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

import * as angular from 'angular';
import { StudentDashboardService } from './studentDashboard.service';
import { DateTimeService } from '../../utility/date/date.service';
import { SessionService } from '../../session/session.service';
import { ReservationService } from '../../reservation/reservationService';

export const StudentDashboardComponent: angular.IComponentOptions = {
    template: require('./studentDashboard.template.html'),
    controller: class StudentDashboardController implements angular.IComponentController {

        userEnrolments: any[];

        constructor(private StudentDashboard: StudentDashboardService,
            private Reservation: ReservationService,
            private Room: any, // TBD
            private DateTime: DateTimeService,
            private Enrolment: any, // TBD
            private Session: SessionService) {
            'ngInject';
        }

        $onInit() {
            this.StudentDashboard.listEnrolments().then(data =>
                this.userEnrolments = data.result
            ).catch(function (e) {
                console.error(e);
            });
        }

        printExamDuration(exam) {
            return this.DateTime.printExamDuration(exam);
        }

        removeReservation(enrolment) {
            this.Reservation.removeReservation(enrolment);
        }

        addEnrolmentInformation(enrolment) {
            this.Enrolment.addEnrolmentInformation(enrolment);
        }

        getUsername(): string {
            return this.Session.getUserName();
        }

        enrolmentRemoved(data) {
            this.userEnrolments.splice(this.userEnrolments.indexOf(data), 1);
        }

        removeEnrolment(enrolment, enrolments) {
            this.Enrolment.removeEnrolment(enrolment, enrolments);
        }
    }
};

