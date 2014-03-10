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
                $scope.checkedState = false;
                $scope.questionsShown = false;
//                $scope.option = {
//                		"checked": ""
//                }

                $scope.doExam = function(hash) {
                    $http.get('/student/doexam/'+$routeParams.hash)
                        .success(function(data, status, headers, config){
                            $scope.doexam = data;
                            $scope.activeSection = $scope.doexam.examSections[0];

                            // Loop through all questions in the active section
                            angular.forEach($scope.activeSection.questions, function(value, index) {
                                if(!value.answer) {
                                    // When question has not been answered it's status color is set to gray
                                	// When an active exam is opened it cannot have any answers set so no need to check them here
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

                $scope.answer = {
                    "option": null
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
                            
                            // Tässä mietin että pitäisikö optionit vielä luupata ja etsiä sieltä se vastattu option, mutta eipä sille taida olla omaa kenttää
//                            angular.forEach(value.options, function(value, index) {
//                            	if (value.correctAnswer) {
//                            		$scope.option = value.answer.option;
//    	                            $scope.option.checked = true;
//                            	}
//                            })
	                            
                            
                            //Todo: tässä loppui taito kun ei elementtiin saanut hanskaa, jotta checked statusta olisi voinut säädellä
//                            var element = document.getElementById($scope.option.id);
//                            element.prop('checked', true);
//                            $('input:radio[name="'+$scope.option.option+'"]').prop('checked', true);
                            //$('input:radio[name="'+option.option+'"]').click();
                           /* var element = angular.element(document.getElementById('#'+option.id));
                            element.click();*/
                        }
                    })
                }

                // Called when the save and exit button is clicked
                $scope.saveExam = function (doexam) {
                    $http.get('/student/saveexam/'+doexam.id);
                }

                // Called when a radiobutton is selected
                $scope.radioChecked = function (question, option) {

                    if(question.answer == null) {
                        question.answer = {
                            "created": null,
                            "creator": null,
                            "modified": null,
                            "modifier": null,
                            "type": "MultipleChoiseQuestion",
                            "comments": [],
                            "option": null
                        }
                    }
//                    $scope.option.checked = true;
                    question.answer.option = option;
                    

//                    $scope.answer.option = document.getElementById(option.id);

                    // Todo: Clear this state if/when radiobuttons can be cleared
                    $scope.checkedState = true;
                    question.questionStatus = $translate("sitnet_question_answered");
                };

                $scope.chevronClicked = function (question) {

                    if($scope.questionsShown) {
                        $scope.questionsShown = false;
                    } else {
                        $scope.questionsShown = true;
                    }

                    if($scope.checkedState) {
                        if($scope.questionsShown) {
                            question.selectedAnsweredState = 'question-active-header';
                        } else {
                            question.selectedAnsweredState = 'question-answered-header';
                        }
                    } else {
                        if($scope.questionsShown) {
                            question.selectedAnsweredState = 'question-active-header';
                        } else {
                            question.selectedAnsweredState = 'question-unanswered-header';
                        }
                    }
                };
            }]);
}());