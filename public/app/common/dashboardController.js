(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('DashboardCtrl', ['$scope', '$http', '$translate', '$location', '$modal', 'SITNET_CONF', 'sessionService', 'ExamRes', 'StudentExamRes', 'dateService',
            function ($scope, $http, $translate, $location, $modal, SITNET_CONF, sessionService, ExamRes, StudentExamRes, dateService) {

                $scope.dashboardToolbarPath = SITNET_CONF.TEMPLATES_PATH + "common/teacher/toolbar.html";
                $scope.dashboardActiveExamsPath = SITNET_CONF.TEMPLATES_PATH + "common/teacher/active_exams.html";
                $scope.dashboardFinishedExamsPath = SITNET_CONF.TEMPLATES_PATH + "common/teacher/finished_exams.html";

                $scope.user = sessionService.getUser();

                if ($scope.user) {
                    if ($scope.user.isStudent) {

                        $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "common/student/dashboard.html";

                        StudentExamRes.enrolments.query({uid: $scope.user.id},
                            function (enrolments) {
                                $scope.userEnrolments = enrolments;

                                if(enrolments && enrolments.length > 0) {

                                    angular.forEach(enrolments, function(enrolment){

                                        StudentExamRes.teachers.get({id: enrolment.exam.id},
                                            function (teachers) {

                                                enrolment.teachers = teachers.map(function (teacher) {
                                                    return teacher.user.firstName + " " + teacher.user.lastName;
                                                }).join(", ");
                                            },
                                            function (error) {
                                                toastr.error(error.data);
                                            }
                                        );
                                    });
                                }
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

                    }
                    else if ($scope.user.isTeacher) {
                        $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "common/teacher/dashboard.html";

                        ExamRes.reviewerExams.query(function (reviewerExams) {

                            $scope.activeExams = reviewerExams.filter(function(review) {
                                return $scope.beforeDate(review.exam.examActiveEndDate);
                            });
                            $scope.finishedExams = reviewerExams.filter(function(review) {
                                return $scope.afterDate(review.exam.examActiveEndDate);
                            });
                            var allExams = $scope.activeExams.concat($scope.finishedExams);
                            angular.forEach(allExams, function (review, index) {
                                ExamRes.examEnrolmentsWithReservations.query({eid: review.exam.id},
                                    function (activeExamEnrolments) {
                                        review.activeExamEnrolments = activeExamEnrolments;
                                    },
                                    function (error) {
                                        toastr.error(error.data);
                                    });

                                ExamRes.examParticipations.query({eid: review.exam.id},
                                    function (examParticipations) {
                                        review.examParticipations = examParticipations;
                                    },
                                    function (error) {
                                        toastr.error(error.data);
                                    });

                                ExamRes.examParticipationsAndReviews.query({eid: review.exam.id},
                                    function (examParticipationsAndReviews) {
                                        review.examParticipationsAndReviews = examParticipationsAndReviews;
                                    },
                                    function (error) {
                                        toastr.error(error.data);
                                    });

                                ExamRes.inspections.get({id: review.exam.id},
                                    function (inspections) {
                                        review.examInspections = inspections.map(function (inspection) {
                                            return inspection.user.firstName + " " + inspection.user.lastName;
                                        }).join(", ");
                                    },
                                    function (error) {
                                        toastr.error(error.data);
                                    });
                            });
                        });
                    }
                    else if ($scope.user.isAdmin) {
                        $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "common/admin/dashboard.html";
                    }
                }

                $scope.printExamDuration = function(exam) {
                   return dateService.printExamDuration(exam);
                };

                $scope.removeReservation = function(enrolment){
                    if (confirm($translate('sitnet_are_you_sure'))) {

                        $http.delete('calendar/reservation/' + enrolment.reservation.id).success(function () {
                            delete enrolment.reservation;
                            toastr.success("ok");
                        });
                    }
                };

                $scope.showInstructions = function(enrolment) {
                    var modalController = function($scope, $modalInstance, instructions) {
                        $scope.instructions = instructions;
                        $scope.ok = function () {
                            $modalInstance.close("Accepted");
                        };
                    };

                    var modalInstance = $modal.open({
                        templateUrl: SITNET_CONF.TEMPLATES_PATH + 'reservation/show_reservation_instructions.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: modalController,
                        resolve: {
                            instructions: function () {
                                return enrolment.exam.enrollInstruction;
                            }
                        }
                    });

                    modalInstance.result.then(function() {
                        console.log("closed");
                    });
                };

                $scope.beforeDate = function(date) {
                    return Date.now() <= new Date(date);
                };

                $scope.afterDate = function(date) {
                    return Date.now() >= new Date(date);
                };

                //Go to feedback template to show teacher's comments
                $scope.showFeedback = function (id) {
                    $location.path("/feedback/exams/" + id);
                };

                $scope.getUsername = function() {
                    return sessionService.getUserName();
                };

                $scope.isExamEnded = function (enrolment) {
                    var end = moment(enrolment.exam.examActiveEndDate).utc();
                    return end.isBefore(moment());
                };
        }]);
}());