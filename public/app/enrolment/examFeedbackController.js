(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamFeedbackController', ['$scope', 'sessionService', '$routeParams', '$location', 'EXAM_CONF', 'StudentExamRes', 'examService',
            function ($scope, sessionService, $routeParams, $location, EXAM_CONF, StudentExamRes, examService) {

                $scope.feedbackTemplate = EXAM_CONF.TEMPLATES_PATH + "enrolment/exam_feedback.html";

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
                    $location.path("/");
                };



            }]);
}());