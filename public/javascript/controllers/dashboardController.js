(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('DashboardCtrl', ['$scope', '$http', '$translate', '$location', 'SITNET_CONF', 'sessionService', 'ExamRes', 'StudentExamRes',
            function ($scope, $http, $translate, $location, SITNET_CONF, sessionService, ExamRes, StudentExamRes) {

                $scope.dashboardToolbarPath = SITNET_CONF.TEMPLATES_PATH + "teacher/toolbar.html";
                $scope.dashboardActiveExamsPath = SITNET_CONF.TEMPLATES_PATH + "teacher/active_exams.html";
                $scope.dashboardFinishedExamsPath = SITNET_CONF.TEMPLATES_PATH + "teacher/finished_exams.html";
                $scope.dashboardUnPublishedExamsPath = SITNET_CONF.TEMPLATES_PATH + "teacher/unpublished_exams.html";

                $scope.session = sessionService;
                $scope.user = $scope.session.user;

                if ($scope.user != null) {
                    if ($scope.user.isStudent) {
                        $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "student/dashboard.html";

                        StudentExamRes.enrolments.query({uid: $scope.user.id},
                            function (enrolments) {
                                $scope.userEnrolments = enrolments;
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

                        ExamRes.activeExams.query(function (activeExams) {
                            $scope.activeExams = activeExams;

                            angular.forEach($scope.activeExams, function (exam, index) {
                                ExamRes.examEnrolments.query({eid: exam.id},
                                    function (activeExamEnrolments) {
                                        exam.activeExamEnrolments = activeExamEnrolments;
                                    },
                                    function (error) {
                                        toastr.error(error.data);
                                    });

                                ExamRes.examParticipations.query({eid: exam.id},
                                    function (examParticipations) {
                                        exam.examParticipations = examParticipations;
                                    },
                                    function (error) {
                                        toastr.error(error.data);
                                    });
                            })
                        })

                        ExamRes.finishedExams.query(function (finishedExams) {
                            $scope.finishedExams = finishedExams;

                            angular.forEach($scope.finishedExams, function (exam, index) {
                                ExamRes.examEnrolments.query({eid: exam.id},
                                    function (finishedExamEnrolments) {
                                        $scope.finishedExamEnrolments = finishedExamEnrolments;
                                    },
                                    function (error) {
                                        toastr.error(error.data);
                                    });

                                ExamRes.examParticipations.query({eid: exam.id},
                                    function (finishedExamParticipations) {
                                        $scope.finishedExamParticipations = finishedExamParticipations;
                                    },
                                    function (error) {
                                        toastr.error(error.data);
                                    });
                            })
                        })

                        ExamRes.examsByState.query({state: 'SAVED'},
                            function (unPublishedExams) {
                                $scope.unPublishedExams = unPublishedExams;
                            },
                            function (error) {
                            }
                        );
                    }
                }

                //Go to feedback template to show teacher's comments
                $scope.showFeedback = function (id) {
                    $location.path("/exams/" + id + "/feedback");
                }


                $scope.getUsername = function() {
                    return $scope.session.user.firstname +" "+ $scope.session.user.lastname;
                }
        }]);
}());