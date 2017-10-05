'use strict';
angular.module('app.dashboard.student')
    .component('studentDashboard', {
        templateUrl: '/assets/app/dashboard/student/studentDashboard.template.html',
        controller: ['StudentDashboard', 'reservationService', 'dateService', 'Enrolment', 'Session', '$translate', '$http',
            function (StudentDashboard, reservationService, dateService, Enrolment, Session, $translate, $http) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.showInst = 0;
                    ctrl.showGuide = 0;
                    StudentDashboard.listEnrolments().then(function (data) {
                        ctrl.userEnrolments = data.result;
                    });
                };

                ctrl.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                ctrl.removeReservation = function (enrolment) {
                    reservationService.removeReservation(enrolment);
                };

                ctrl.showInstructions = function (id) {
                    ctrl.showInst = ctrl.showInst === id ? 0 : id;
                };

                ctrl.showRoomGuide = function (hash) {

                    // fetch room instructions
                    if (!ctrl.currentLanguageText) {
                        $http.get('/app/enroll/room/' + hash)
                            .success(function (data) {
                                ctrl.info = data;
                                ctrl.currentLanguageText = currentLanguage();
                            });
                    }
                    ctrl.showGuide = ctrl.showGuide === hash ? 0 : hash;
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
