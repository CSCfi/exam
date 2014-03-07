(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('StudentExamController', ['$scope', '$http', '$modal', '$location', '$translate', 'SITNET_CONF', 'StudentExamRes',
            function ($scope, $http, $modal, $location, $translate, SITNET_CONF, StudentExamRes) {

                $scope.sectionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section.html";
                $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_question.html";
                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_general.html";

                $scope.exams = StudentExamRes.query();
                $scope.exam = null;
                $scope.checkedState = false;
                $scope.questionsShown = false;
                // Initial text for question status is unanswered
                $scope.questionStatus = $translate("sitnet_question_unanswered");
                // Initial state for questions is unanswered
                $scope.selectedAnsweredState = 'question-unanswered-header';

                $scope.activateExam = function (exam) {
                    $scope.exam = exam;
                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/terms_of_use.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "ModalInstanceCtrl"
                    });

                    modalInstance.result.then(function () {
                        // Todo: Make it work with angular style
//                        $http.get('#/student/doexam/'+$scope.exam.hash);
//                        $window.location = '#/student/doexam/'+$scope.exam.hash;
                        $location.path('/student/doexam/'+$scope.exam.hash);
                    }, function () {
                        $console.log('Modal dismissed at: ' + new Date());
                    });
                };

                // Called when the save and exit button is clicked
                $scope.saveExam = function (doexam) {
                    $http.get('/student/saveexam/'+doexam.id);
                }

                // Called when a radiobutton is selected
                $scope.radioChecked = function (option) {

//                    var checkbox = document.getElementById(option.id);

                    // Todo: Clear this state if/when radiobuttons can be cleared
                    $scope.checkedState = true;
                    $scope.questionStatus = $translate("sitnet_question_answered");
                };

                $scope.chevronClicked = function () {

                    if($scope.questionsShown) {
                        $scope.questionsShown = false;
                    } else {
                        $scope.questionsShown = true;
                    }

                    if($scope.checkedState) {
                        if($scope.questionsShown) {
                            $scope.selectedAnsweredState = 'question-active-header';
                        } else {
                            $scope.selectedAnsweredState = 'question-answered-header';
                        }
                    } else {
                        if($scope.questionsShown) {
                            $scope.selectedAnsweredState = 'question-active-header';
                        } else {
                            $scope.selectedAnsweredState = 'question-unanswered-header';
                        }
                    }
                };
            }]);
}());