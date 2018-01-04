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

'use strict';
angular.module('app.dashboard.student')
    .component('studentDashboard', {
        templateUrl: '/assets/app/dashboard/student/studentDashboard.template.html',
        controller: ['StudentDashboard', 'Reservation', 'Room', 'DateTime', 'Enrolment', 'Session',
            function (StudentDashboard, Reservation, Room, DateTime, Enrolment, Session) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.showInst = 0;
                    ctrl.showGuide = 0;
                    StudentDashboard.listEnrolments().then(function (data) {
                        ctrl.userEnrolments = data.result;
                    }).catch(function (e) {
                        console.error(e);
                    });
                };

                ctrl.printExamDuration = function (exam) {
                    return DateTime.printExamDuration(exam);
                };

                ctrl.removeReservation = function (enrolment) {
                    Reservation.removeReservation(enrolment);
                };

                ctrl.showInstructions = function (id) {
                    ctrl.showInst = ctrl.showInst === id ? 0 : id;
                };

                ctrl.showMaturityInstructions = function (enrolment) {
                    Enrolment.showMaturityInstructions(enrolment);
                };

                ctrl.addEnrolmentInformation = function (enrolment) {
                    Enrolment.addEnrolmentInformation(enrolment);
                };

                ctrl.getUsername = function () {
                    return Session.getUserName();
                };

                ctrl.enrolmentRemoved = function (data) {
                    ctrl.userEnrolments.splice(ctrl.userEnrolments.indexOf(data), 1);
                };

                ctrl.removeEnrolment = function (enrolment, enrolments) {
                    Enrolment.removeEnrolment(enrolment, enrolments);
                };


            }]
    });
