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
