(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('DashboardCtrl', ['$scope', '$http', '$translate', '$location', 'SITNET_CONF', 'sessionService', 'ExamRes', 'StudentExamRes',
            function ($scope, $http, $translate, $location, SITNET_CONF, sessionService, ExamRes, StudentExamRes) {

                $scope.dashboardToolbarPath = SITNET_CONF.TEMPLATES_PATH + "teacher/toolbar.html";
                $scope.dashboardActiveExamsPath = SITNET_CONF.TEMPLATES_PATH + "teacher/active_exams.html";
                $scope.dashboardFinishedExamsPath = SITNET_CONF.TEMPLATES_PATH + "teacher/finished_exams.html";

                $scope.session = sessionService;
                $scope.user = $scope.session.user;

                if ($scope.user != null) {
                    if ($scope.user.isStudent) {

                        $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "student/dashboard.html";

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
                        $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "teacher/dashboard.html";

                        ExamRes.reviewerExams.query(function (reviewerExams) {

                            $scope.reviewerExams = reviewerExams;

                            angular.forEach($scope.reviewerExams, function (review, index) {
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

                        // TODO: useless
//                        ExamRes.examsByState.query({state: 'SAVED'},
//                            function (unPublishedExams) {
//                                $scope.unPublishedExams = unPublishedExams;
//                            },
//                            function (error) {
//                            }
//                        );
                    }
                    else if ($scope.user.isAdmin) {
                        $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/dashboard.html";

                    }
                }

                $scope.printExamDuration = function(exam) {

                    if(exam && exam.duration) {
                        var h = 0;
                        var d = exam.duration;

                        while (d > 0) {
                            if (d - 60 >= 0) {
                                h++;
                                d = d - 60;
                            } else {
                                break;
                            }
                        }
                        if (h === 0) {
                            return d + "min";
                        } else if (d === 0) {
                            return h + "h ";
                        } else {
                            return h + "h " + d + "min";
                        }
                    } else {
                        return "";
                    }
                };

                $scope.removeReservation = function(enrolment){
                    if (confirm($translate('sitnet_are_you_sure'))) {

                        $http.delete('calendar/reservation/' + enrolment.reservation.id).success(function () {
                            delete enrolment.reservation;
                            toastr.success("ok");
                        });
                    }
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
                    return $scope.session.user.firstname +" "+ $scope.session.user.lastname;
                };

                $scope.isExamEnded = function (enrolment) {
                    var end = moment(enrolment.exam.examActiveEndDate).utc();
                    return end.isBefore(moment());
                };
        }]);
}());