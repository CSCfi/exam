(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('DashboardCtrl', ['dialogs', '$scope', '$http', '$translate', '$location', '$modal', 'EXAM_CONF',
            'sessionService', 'ExamRes', 'examService', 'questionService', 'StudentExamRes', 'dateService', 'EnrollRes',
            function (dialogs, $scope, $http, $translate, $location, $modal, EXAM_CONF,
                      sessionService, ExamRes, examService, questionService, StudentExamRes, dateService, EnrollRes) {

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
                                    setExamOwners(enrolment.exam);
                                });
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                        StudentExamRes.finishedExams.query({uid: $scope.user.id},
                            function (finishedExams) {
                                $scope.studentFinishedExams = finishedExams;
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
                                setExamOwners(exam);
                            });
                        });
                    }
                    else if ($scope.user.isAdmin) {
                        $scope.templates.dashboardTemplate = EXAM_CONF.TEMPLATES_PATH + "reservation/reservations.html";
                    }
                }

                var printTeacher = function (teacher, tag) {
                    var t = [teacher.firstName, teacher.lastName].join(" ");
                    if (tag) {
                        return ['<', tag, '>', t, '</', tag, '>'].join('');
                    } else {
                        return t;
                    }
                };

                var setExamOwners = function (exam) {
                    exam.teachersStr = "";
                    var i = 0;
                    angular.forEach(exam.examOwners, function (owner) {
                        if (i++ !== 0) {
                            exam.teachersStr += ", ";
                        }
                        exam.teachersStr += printTeacher(owner, $scope.user.isStudent ? undefined : 'b');
                    });
                    i = 0;
                    angular.forEach(exam.examInspections, function (inspection) {
                        var user = inspection.user;
                        if (exam.teachersStr.indexOf(printTeacher(user, 'b')) === -1) {
                            if (i++ !== 0 || exam.teachersStr.length > 0) {
                                exam.teachersStr += ", ";
                            }
                            exam.teachersStr += printTeacher(user, $scope.user.isStudent ? undefined : 'span');
                        }
                    });
                };

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
                    var modalController = function ($scope, $modalInstance, instructions) {
                        $scope.instructions = instructions;
                        $scope.ok = function () {
                            $modalInstance.close("Accepted");
                        };
                    };

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'reservation/show_reservation_instructions.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: modalController,
                        resolve: {
                            instructions: function () {
                                return enrolment.exam.enrollInstruction;
                            }
                        }
                    });

                    modalInstance.result.then(function () {
                        console.log("closed");
                    });
                };

                $scope.addEnrolmentInformation = function (enrolment) {
                    var modalController = function ($scope, $modalInstance) {
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
                    };

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

                $scope.createExam = function () {
                    examService.createExam();
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
                }

            }]);
}());