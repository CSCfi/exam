'use strict';
angular.module("dashboard.student")
    .component('studentDashboard', {
        templateUrl: '/assets/app/dashboard/student/studentDashboard.template.html',
        controller: ['StudentDashboard', 'reservationService', 'dateService', 'enrolmentService', 'Session',
            '$translate', '$http',
            function (StudentDashboard, reservationService, dateService, enrolmentService, Session, $translate,
                      $http) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.showInst = 0;
                    ctrl.showGuide = 0;
                    StudentDashboard.listEnrolments().then(function (data) {
                        ctrl.userEnrolments = data.result;
                    })
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

                ctrl.showRoomGuide = function (id) {

                    // fetch room instructions
                    if (!ctrl.currentLanguageText) {
                        $http.get('/app/enroll/room/' + id)
                            .success(function (data) {
                                ctrl.info = data;
                                ctrl.currentLanguageText = currentLanguage();
                            });
                    }
                    ctrl.showGuide = ctrl.showGuide === id ? 0 : id;
                };

                ctrl.showMaturityInstructions = function (enrolment) {
                    enrolmentService.showMaturityInstructions(enrolment);
                };

                ctrl.addEnrolmentInformation = function (enrolment) {
                    enrolmentService.addEnrolmentInformation(enrolment);
                };

                ctrl.getUsername = function () {
                    return Session.getUserName();
                };

                ctrl.removeEnrolment = function (enrolment, enrolments) {
                    enrolmentService.removeEnrolment(enrolment, enrolments);
                };

                function currentLanguage() {
                    var tmp = "";

                    if (ctrl.info &&
                        ctrl.info.reservation &&
                        ctrl.info.reservation.machine &&
                        ctrl.info.reservation.machine.room) {

                        switch ($translate.use()) {
                            case "fi":
                                if (ctrl.info.reservation.machine.room.roomInstruction) {
                                    tmp = ctrl.info.reservation.machine.room.roomInstruction;
                                }
                                break;
                            case "sv":
                                if (ctrl.info.reservation.machine.room.roomInstructionSV) {
                                    tmp = ctrl.info.reservation.machine.room.roomInstructionSV;
                                }
                                break;
                            case "en":
                            /* falls through */
                            default:
                                if (ctrl.info.reservation.machine.room.roomInstructionEN) {
                                    tmp = ctrl.info.reservation.machine.room.roomInstructionEN;
                                }
                                break;
                        }
                    }
                    return tmp;
                }

            }]
    });
