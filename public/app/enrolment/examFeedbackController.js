(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamFeedbackController', ['$scope', 'sessionService', '$routeParams', '$location', 'SITNET_CONF', 'StudentExamRes', 'examService',
            function ($scope, sessionService, $routeParams, $location, SITNET_CONF, StudentExamRes, examService) {

                $scope.feedbackTemplate = SITNET_CONF.TEMPLATES_PATH + "enrolment/exam_feedback.html";

                StudentExamRes.feedback.get({eid: $routeParams.id},
                    function (exam) {
                        exam.grade.displayName = examService.getExamGradeDisplayName(exam.grade.name);
                        examService.setExamOwnersAndInspectors(exam);
                        examService.setCredit(exam);
                        $scope.reviewedExam = exam;
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                //Go to feedback template to show teacher's comments
                $scope.exitFeedback = function () {
                    $location.path("/home");
                };



            }]);
}());