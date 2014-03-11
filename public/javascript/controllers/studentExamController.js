(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('StudentExamController', ['$scope', '$routeParams', '$http', '$modal', '$location', '$translate', 'SITNET_CONF', 'StudentExamRes',
            function ($scope, $routeParams, $http, $modal, $location, $translate, SITNET_CONF, StudentExamRes) {

                $scope.sectionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section.html";
                $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_question.html";
                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_general.html";
                $scope.sectionsBar = SITNET_CONF.TEMPLATES_PATH + "/student_sections_bar.html";
                $scope.multipleChoiseQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/multiple_choice_question.html";
                $scope.multipleChoiseOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/multiple_choice_option.html";

                $scope.exams = StudentExamRes.query();
                $scope.exam = null;
                $scope.questionAnswered = false;
                $scope.questionsShown = false;

                $scope.doExam = function(hash) {
                    $http.get('/student/doexam/'+$routeParams.hash)
                        .success(function(data, status, headers, config) {
                            $scope.doexam = data;
                            $scope.activeSection = $scope.doexam.examSections[0];

                            // Loop through all questions in the active section
                            angular.forEach($scope.activeSection.questions, function(value, index) {
                                if(!value.answer) {
                                    // When question has not been answered it's status color is set to gray
                                	// When an active exam is opened it cannot have any answers set
                                    value.selectedAnsweredState = 'question-unanswered-header';
                                    value.questionStatus = $translate("sitnet_question_unanswered");
                                } else {
                                    value.selectedAnsweredState = 'question-answered-header';
                                    value.questionStatus = $translate("sitnet_question_answered");
                                }
                            })
                        }).
                        error(function(data, status, headers, config) {
                            // called asynchronously if an error occurs
                            // or server returns response with an error status.
                        });
                }
                $scope.doExam();

                $scope.answeredExam = {
                    "name": "Kirjoita tentin nimi tähän",
                    "instruction": "Tentissä saa käyttää apuna lähdemateriaalia",
                    "examSections": []
                };

                $scope.activateExam = function (exam) {
                    $scope.exam = exam;
                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/terms_of_use.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "ModalInstanceCtrl"
                    });

                    modalInstance.result.then(function () {
                        $location.path('/student/doexam/'+$scope.exam.hash);
                    }, function () {
                        $console.log('Modal dismissed at: ' + new Date());
                    });
                };

                $scope.setActiveSection = function(section) {
                    $scope.activeSection = section;

                    // Loop through all questions in the active section
                    angular.forEach($scope.activeSection.questions, function(value, index) {
                        if(!value.answer) {
                            // When question has not been answered it's status color is set to gray
                            value.selectedAnsweredState = 'question-unanswered-header';
                            value.questionStatus = $translate("sitnet_question_unanswered");
                        } else {
                            value.selectedAnsweredState = 'question-answered-header';
                            value.questionStatus = $translate("sitnet_question_answered");
                        }
                    })
                }

                // Called when the save and exit button is clicked
                $scope.saveExam = function (doexam) {
                    $http.get('/student/saveexam/'+doexam.id);
                }

                // Called when a radiobutton is selected
                $scope.radioChecked = function (question, option) {

                    if(option.checked == true) {
                        option.checked = false;
                    } else {
                        option.checked = true;
                    }

                    if(question.answer == null) {
                        question.answer = {
                            "created": null,
                            "creator": null,
                            "modified": null,
                            "modifier": null,
                            "type": "MultipleChoiseQuestion",
                            "comments": [],
                            "option": null,
                            "checked": false
                        }
                    }
                    question.answer.option = option;
                    $scope.option = option;

                    question.questionStatus = $translate("sitnet_question_answered");
                };

                // Called when the chevron is clicked
                $scope.chevronClicked = function (question) {

                    // Flag for indicating are the questions shown or hidden
                    if(question.questionsShown) {
                        question.questionsShown = false;
                    } else {
                        question.questionsShown = true;
                    }

                    // Loop through the options in question
                    angular.forEach(question.options, function(value, index) {
                        // If any option is checked, then the question is considered answered
                        if(value.checked) {
                             $scope.questionAnswered = true;
                        }
                    });

                    // State machine for resolving how the question header is drawn
                    if($scope.questionAnswered) {
                        if(question.questionsShown) {
                            question.selectedAnsweredState = 'question-active-header';
                        } else {
                            question.selectedAnsweredState = 'question-answered-header';
                        }
                    } else {
                        if(question.questionsShown) {
                            question.selectedAnsweredState = 'question-active-header';
                        } else {
                            question.selectedAnsweredState = 'question-unanswered-header';
                        }
                    }
                };
            }]);
}());