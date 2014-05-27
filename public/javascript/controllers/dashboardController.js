(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('DashboardCtrl', ['$scope', '$http', '$translate', '$location', 'SITNET_CONF', 'sessionService', 'examService', 'ExamRes', 'StudentExamRes',
            function ($scope, $http, $translate, $location, SITNET_CONF, sessionService, examService, ExamRes, StudentExamRes) {

                $scope.session = sessionService;
                $scope.dashboardTemplate = null;

                $scope.allReviewedExams = ExamRes.examsByState.query({state: 'REVIEW'});

//                $scope.allReviewedExams = examService.allReviewedExams;

                $scope.user = $scope.session.user;

                if ($scope.user != null) {
                    $scope.finishedExams = StudentExamRes.finishedExams.query();

                    ExamRes.enrolments.query({uid: $scope.user.id},
                        function (enrolments) {
                            $scope.userEnrolments = enrolments;
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