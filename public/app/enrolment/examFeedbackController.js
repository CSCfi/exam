(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamFeedbackController', ['$scope', 'sessionService', '$routeParams', '$location', 'SITNET_CONF', 'StudentExamRes', 'examService',
            function ($scope, sessionService, $routeParams, $location, SITNET_CONF, StudentExamRes, examService) {

                $scope.feedbackTemplate = SITNET_CONF.TEMPLATES_PATH + "enrolment/exam_feedback.html";

                StudentExamRes.feedback.get({eid: $routeParams.id},
                    function (exam) {
                        exam.grade.displayName = examService.getExamGradeDisplayName(exam.grade.name);
                        setExamOwners(exam);
                        setCredit(exam);
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

                function setExamOwners(exam) {
                    exam.examTeachers = [];
                    exam.teachersStr = "";
                    angular.forEach(exam.parent.examOwners, function(owner){
                        if(exam.examTeachers.indexOf(owner.firstName + " " + owner.lastName) === -1) {
                            exam.examTeachers.push(owner.firstName + " " + owner.lastName);
                        }
                    });
                    exam.teachersStr = exam.examTeachers.map(function(teacher) {
                        return teacher;
                    }).join(", ");
                }

                function setCredit(exam) {
                    if(exam.customCredit !== undefined && exam.customCredit) {
                        exam.credit = exam.customCredit;
                    } else {
                        exam.credit = exam.course.credits;
                    }
                }

            }]);
}());