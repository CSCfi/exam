(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('DashboardCtrl', ['$scope', '$http', '$translate', '$location', 'SITNET_CONF', 'sessionService', 'examService', 'ExamRes', 'StudentExamRes',
            function ($scope, $http, $translate, $location, SITNET_CONF, sessionService, examService, ExamRes, StudentExamRes) {

                $scope.session = sessionService;
                $scope.dashboardTemplate = null;

                $scope.allReviewedExams = ExamRes.examsByState.query({state: 'REVIEW'});

                $scope.user = $scope.session.user;

                if ($scope.user != null) {
                    $scope.finishedExams = StudentExamRes.finishedExams.query();

                    ExamRes.enrolments.query({uid: $scope.user.id},
                        function (enrolments) {
                            $scope.userEnrolments = enrolments;

//                            angular.forEach($scope.userEnrolments, function (enrolment) {
//
//                                if (enrolment.reservation) {
//                                    var d = new Date(enrolment.reservation.startAt);
//
//                                    var curr_date = d.getDate();
//                                    var curr_month = d.getMonth() + 1; // Months are zero based
//                                    var curr_year = d.getFullYear();
//                                    var curr_hour = d.getHours();
//                                    var curr_min = d.getMinutes();
////                                    $scope.startAt = curr_date + "." + curr_month + "." + curr_year + " " + curr_hour + ":" + curr_min;
//
//                                    enrolment.reservation.startAt = curr_date + "." + curr_month + "." + curr_year + " " + curr_hour + ":" + curr_min;
//                                }
//                            });
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );

                    if ($scope.user.isStudent) {
                        $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "student/dashboard.html";
                    }
                    else if ($scope.user.isTeacher) {
                        $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "teacher/dashboard.html";
                    }
                }

                $scope.getUsername = function() {
                    return $scope.session.user.firstname +" "+ $scope.session.user.lastname;
                }




//                ExamRes.examsByState.query({state: 'REVIEW'},
//                    function (exams) {
//                        $scope.allReviewedExams = exams;
//
//                        $scope.user = $scope.session.user;
//
//                        if ($scope.user != null) {
//                            if ($scope.user.isStudent) {
//                                $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "student/dashboard.html";
//                            }
//                            else if ($scope.user.isTeacher) {
//                                $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "teacher/dashboard.html";
//                            }
//                        }
//                    },
//                    function (error) {
//                        var msg = "ERROR";
//                    }
//                );
        }]);
}());