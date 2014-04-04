(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('DashboardCtrl', ['$scope', '$http', '$translate', 'SITNET_CONF', 'sessionService', 'examService', 'ExamRes', '$location',
            function ($scope, $http, $translate, SITNET_CONF, sessionService, examService, ExamRes, $location) {

                $scope.session = sessionService;
                $scope.dashboardTemplate = null;



                $scope.allReviewedExams = examService.allReviewedExams;

                $scope.user = $scope.session.user;

                        if ($scope.user != null) {
                            if ($scope.user.isStudent) {
                                $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "student/dashboard.html";
                            }
                            else if ($scope.user.isTeacher) {
                                $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "teacher/dashboard.html";
                            }
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