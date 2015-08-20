(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('DashboardCtrl', ['dialogs', '$scope', '$http', '$translate', '$location', '$modal', 'EXAM_CONF',
            'sessionService', 'ExamRes', 'examService', 'questionService', 'StudentExamRes', 'dateService', 'EnrollRes',
            'enrolmentService',
            function (dialogs, $scope, $http, $translate, $location, $modal, EXAM_CONF, sessionService, ExamRes,
                      examService, questionService, StudentExamRes, dateService, EnrollRes, enrolmentService) {

                $scope.templates = {
                    dashboardToolbarPath: EXAM_CONF.TEMPLATES_PATH + "common/teacher/toolbar.html",
                    dashboardActiveExamsPath: EXAM_CONF.TEMPLATES_PATH + "common/teacher/active_exams.html",
                    dashboardFinishedExamsPath: EXAM_CONF.TEMPLATES_PATH + "common/teacher/finished_exams.html"
                };

                // Pagesize for showing finished exams
                $scope.pageSize = 10;

                $scope.user = sessionService.getUser();

                if ($scope.user) {
                    if ($scope.user.isStudent) {
                        $scope.templates.dashboardTemplate = EXAM_CONF.TEMPLATES_PATH + "common/student/dashboard.html";
                        StudentExamRes.enrolments.query(function (enrolments) {
                                $scope.userEnrolments = enrolments;
                                angular.forEach($scope.userEnrolments, function (enrolment) {
                                    examService.setExamOwnersAndInspectors(enrolment.exam);
                                });
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                        StudentExamRes.finishedExams.query({uid: $scope.user.id},
                            function (participations) {
                                participations.forEach(function (participation) {
                                    participation.exam.examInspections = [];
                                    participation.exam.examInspectors.forEach(function (inspector) {
                                        participation.exam.examInspections.push({user: inspector});
                                    });
                                    examService.setExamOwnersAndInspectors(participation.exam);
                                });
                                $scope.participations = participations;
                            },
                            function (error) {
                                toastr.error(error.data);
                            });

                    } else if ($scope.user.isTeacher) {
                        $scope.templates.dashboardTemplate = EXAM_CONF.TEMPLATES_PATH + "common/teacher/dashboard.html";

                        ExamRes.reviewerExams.query(function (reviewerExams) {
                            $scope.activeExams = reviewerExams.filter(function (review) {
                                return $scope.beforeDate(review.examActiveEndDate);
                            });
                            $scope.finishedExams = reviewerExams.filter(function (review) {
                                return $scope.afterDate(review.examActiveEndDate);
                            });
                            var allExams = $scope.activeExams.concat($scope.finishedExams);

                            angular.forEach(allExams, function (exam) {
                                examService.setExamOwnersAndInspectors(exam, true);
                            });
                        });
                    }
                    else if ($scope.user.isAdmin) {
                        $scope.templates.dashboardTemplate = EXAM_CONF.TEMPLATES_PATH + "reservation/reservations.html";
                    }
                }

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.removeReservation = function (enrolment) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                    dialog.result.then(function (btn) {
                        $http.delete('calendar/reservation/' + enrolment.reservation.id).success(function () {
                            delete enrolment.reservation;
                            enrolment.reservationCanceled = true;
                        }).error(function (msg) {
                            toastr.error(msg);
                        });
                    });
                };

                $scope.showInstructions = function (enrolment) {
                    enrolmentService.showInstructions(enrolment);
                };

                $scope.addEnrolmentInformation = function (enrolment) {
                    var modalController = ["$scope", "$modalInstance", function ($scope, $modalInstance) {
                        $scope.enrolment = angular.copy(enrolment);
                        $scope.ok = function () {
                            $modalInstance.close("Accepted");
                            enrolment.information = $scope.enrolment.information;
                            StudentExamRes.enrolment.update({
                                eid: enrolment.id,
                                information: $scope.enrolment.information
                            }, function () {
                                toastr.success($translate.instant('sitnet_saved'));
                            })
                        };

                        $scope.cancel = function () {
                            $modalInstance.close("Canceled");
                        }
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'enrolment/add_enrolment_information.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: modalController,
                        resolve: {
                            enrolment: function () {
                                return $scope.enrolment;
                            }
                        }
                    });

                    modalInstance.result.then(function () {
                        console.log("closed");
                    });
                };

                $scope.beforeDate = function (date) {
                    return Date.now() <= new Date(date);
                };

                $scope.afterDate = function (date) {
                    return Date.now() >= new Date(date);
                };

                //Go to feedback template to show teacher's comments
                $scope.showFeedback = function (id) {
                    $location.path("/feedback/exams/" + id);
                };

                $scope.getUsername = function () {
                    return sessionService.getUserName();
                };

                $scope.isExamEnded = function (enrolment) {
                    var end = moment(enrolment.exam.examActiveEndDate).utc();
                    return end.isBefore(moment());
                };

                $scope.createExam = function (executionType) {
                    examService.createExam(executionType);
                };

                $scope.createQuestion = function (type) {
                    questionService.createQuestion(type);
                };

                $scope.getReviewablesCount = function (exam) {
                    return exam.children.filter(function (child) {
                        return child.state === 'REVIEW' || child.state === 'REVIEW_STARTED'
                    }).length;
                };

                $scope.getReservationCount = function (exam) {
                    return exam.examEnrolments.filter(function (enrolment) {
                        return enrolment.reservation;
                    }).length;
                };

                $scope.removeEnrolment = function (enrolment) {
                    if (enrolment.reservation) {
                        toastr.error($translate.instant('sitnet_cancel_reservation_first'));
                    } else {
                        dialogs.confirm($translate.instant('sitnet_confirm'),
                            $translate.instant('sitnet_are_you_sure')).result
                            .then(function () {
                                EnrollRes.enrolment.remove({id: enrolment.id}, function () {
                                    $scope.userEnrolments.splice($scope.userEnrolments.indexOf(enrolment), 1);
                                });
                            });
                    }
                };

                $scope.showReservations = function (examId) {
                    $location.path('/reservations').search({eid: examId});
                };

            }]);
}());