(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('DashboardCtrl', ['$scope', 'dashboardService', 'examService', 'questionService',
            'reservationService', 'dateService', 'enrolmentService', 'sessionService', 'EXAM_CONF', 'ExamRes',
            'dialogs', '$translate', '$location', '$filter', '$http',
            function ($scope, dashboardService, examService, questionService, reservationService, dateService,
                      enrolmentService, sessionService, EXAM_CONF, ExamRes, dialogs, $translate, $location, $filter,
                      $http) {

                $scope.templates = dashboardService.getTemplates();
                // Pagesize for showing finished exams
                $scope.pageSize = 10;
                $scope.showInst = 0;
                $scope.showGuide = 0;
                $scope.filtertext = '';
                $scope.reduceDraftCount = 0;

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.removeReservation = function (enrolment) {
                    reservationService.removeReservation(enrolment);
                };

                $scope.showInstructions = function (id) {

                    if ($scope.showInst == id) {
                        $scope.showInst = 0;
                    }
                    else {
                        $scope.showInst = id;
                    }
                };

                $scope.showRoomGuide = function (id) {

                    // fetch room instructions
                    if (!$scope.currentLanguageText) {
                        $http.get('/app/enroll/room/' + id)
                            .success(function (data) {
                                $scope.info = data;
                                $scope.currentLanguageText = currentLanguage();
                            });
                    }

                    if ($scope.showGuide == id) {
                        $scope.showGuide = 0;
                    }
                    else {
                        $scope.showGuide = id;
                    }
                };

                $scope.showMaturityInstructions = function (enrolment) {
                    enrolmentService.showMaturityInstructions(enrolment);
                };

                $scope.addEnrolmentInformation = function (enrolment) {
                    enrolmentService.addEnrolmentInformation(enrolment);
                };

                //Go to feedback template to show teacher's comments
                $scope.showFeedback = function (id) {
                    examService.showFeedback(id);
                };

                $scope.getUsername = function () {
                    return sessionService.getUserName();
                };

                $scope.removeEnrolment = function (enrolment, enrolments) {
                    enrolmentService.removeEnrolment(enrolment, enrolments);
                };

                $scope.showReservations = function (examId) {
                    reservationService.viewReservations(examId);
                };

                $scope.getExecutionTypeTranslation = function (exam) {
                    return examService.getExecutionTypeTranslation(exam.executionType.type);
                };

                $scope.checkOwner = function (isOwner) {

                    if (isOwner) {
                        $scope.reduceDraftCount += 1;
                        return true;
                    }

                    return false;
                };

                $scope.search = function () {

                    $scope.reduceDraftCount = 0;
                    var userId = sessionService.getUser().id;

                    // Use same search parameter for all the 4 result tables
                    $scope.filteredFinished = $filter('filter')($scope.finishedExams, $scope.filter.text);
                    $scope.filteredActive = $filter('filter')($scope.activeExams, $scope.filter.text);
                    $scope.filteredArchived = $filter('filter')($scope.archivedExams, $scope.filter.text);
                    $scope.filteredDraft = $filter('filter')($scope.draftExams, $scope.filter.text);

                    // for drafts, display exams only for owners AM-1658
                    $scope.filteredDraft = $scope.filteredDraft.filter(function (exam) {
                        var owner = exam.examOwners.filter(function (own) {
                            return (own.id === userId);
                        });
                        if (owner.length > 0) {
                            return exam;
                        }
                        return false;
                    });

                    // for finished, display exams only for owners OR if exam has unassessed reviews AM-1658
                    $scope.filteredFinished = $scope.filteredFinished.filter(function (exam) {
                        var owner = exam.examOwners.filter(function (own) {
                            return (own.id === userId);
                        });
                        if (owner.length > 0 || (owner.length == 0 && exam.unassessedCount > 0)) {
                            return exam;
                        }
                        return false;
                    });

                    // for active, display exams only for owners OR if exam has unassessed reviews AM-1658
                    $scope.filteredActive = $scope.filteredActive.filter(function (exam) {
                        var owner = exam.examOwners.filter(function (own) {
                            return (own.id === userId);
                        });
                        if (owner.length > 0 || (owner.length == 0 && exam.unassessedCount > 0)) {
                            return exam;
                        }
                        return false;
                    });


                };

                dashboardService.showDashboard().then(function (data) {
                    for (var k in data) {
                        if (data.hasOwnProperty(k)) {
                            $scope[k] = data[k];
                        }
                    }

                    $scope.filteredFinished = $scope.finishedExams;
                    $scope.filteredActive = $scope.activeExams;
                    $scope.filteredArchived = $scope.archivedExams;
                    $scope.filteredDraft = $scope.draftExams;

                }, function (error) {
                    toastr.error(error.data);
                });

                $scope.copyExam = function (exam, type) {
                    ExamRes.exams.copy({id: exam.id, type: type}, function (copy) {
                        toastr.success($translate.instant('sitnet_exam_copied'));
                        $location.path("/exams/examTabs/" + copy.id + "/1/");
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.deleteExam = function (exam, listing) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                    dialog.result.then(function (btn) {
                        ExamRes.exams.remove({id: exam.id}, function (ex) {
                            toastr.success($translate.instant('sitnet_exam_removed'));
                            if (listing == 'archived') {
                                $scope.archivedExams.splice($scope.archivedExams.indexOf(exam), 1);
                            }
                            if (listing == 'finished') {
                                $scope.finishedExams.splice($scope.finishedExams.indexOf(exam), 1);
                            }
                            if (listing == 'draft') {
                                $scope.draftExams.splice($scope.draftExams.indexOf(exam), 1);
                            }
                            if (listing == 'active') {
                                $scope.activeExams.splice($scope.activeExams.indexOf(exam), 1);
                            }


                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }, function (btn) {

                    });
                };

                $scope.filterOwners = function (userId, exam) {
                    var owner = exam.examOwners.filter(function (own) {
                        return (own.id === userId);
                    });
                    return owner.length > 0;
                };

                function currentLanguage() {
                    var tmp = "";

                    if ($scope.info &&
                        $scope.info.reservation &&
                        $scope.info.reservation.machine &&
                        $scope.info.reservation.machine.room) {

                        switch ($translate.use()) {
                            case "fi":
                                if ($scope.info.reservation.machine.room.roomInstruction) {
                                    tmp = $scope.info.reservation.machine.room.roomInstruction;
                                }
                                break;
                            case "sv":
                                if ($scope.info.reservation.machine.room.roomInstructionSV) {
                                    tmp = $scope.info.reservation.machine.room.roomInstructionSV;
                                }
                                break;
                            case "en":
                            /* falls through */
                            default:
                                if ($scope.info.reservation.machine.room.roomInstructionEN) {
                                    tmp = $scope.info.reservation.machine.room.roomInstructionEN;
                                }
                                break;
                        }
                    }
                    return tmp;
                }

            }]);
}());
