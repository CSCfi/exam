(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('TeacherExamController', ['$scope', '$sce', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'StudentExamRes', 'QuestionRes',
            function ($scope, $sce, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, StudentExamRes, QuestionRes) {

                $scope.multipleChoiseOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/multiple_choice_option.html";
                $scope.essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/essay_question.html";
                $scope.sectionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/section_template.html";

                //$scope.exams = StudentExamRes.exams.query();
                $scope.tempQuestion = null;

                // section back / forward buttons
                $scope.guide = false;
                $scope.switchToGuide = function(b) {
                    $scope.guide = b;
                };
                $scope.previousButton = false;
                $scope.previousButtonText = "";

                $scope.nextButton = false;
                $scope.nextButtonText = "";

                $scope.previewSwitch = true;

                $scope.switchButtons = function(section) {

                    var i = section.index - 1;

                    if ($scope.doexam.examSections[i-1]) {
                        $scope.previousButton = true;
                        $scope.previousButtonText = $scope.doexam.examSections[i-1].index + ". " + $scope.doexam.examSections[i-1].name;
                    } else {
                        $scope.previousButton = true;
                        $scope.previousButtonText = $translate("sitnet_exam_quide");
                    }

                    if(i == 0 && $scope.guide) {
                        $scope.nextButton = true;
                        $scope.nextButtonText = $scope.doexam.examSections[0].index + ". " + $scope.doexam.examSections[0].name;
                    } else if (!$scope.guide && $scope.doexam.examSections[i+1]) {
                        $scope.nextButton = true;
                        $scope.nextButtonText = $scope.doexam.examSections[i+1].index + ". " + $scope.doexam.examSections[i+1].name;
                    } else {
                        $scope.nextButton = false;
                        $scope.nextButtonText = "";
                    }
                };

                $scope.previewExam = function () {

                    $http.get('/exampreview/' + $routeParams.id)
                        .success(function (data, status, headers, config) {
                            $scope.doexam = data;
                            $scope.activeSection = $scope.doexam.examSections[0];

                            // Set sections and question numbering
                            angular.forEach($scope.doexam.examSections, function (section, index) {
                                section.index = index +1;

                                angular.forEach(section.sectionQuestions, function (sectionQuestion, index) {
                                    sectionQuestion.index = index +1;
                                });
                            });

                            // Loop through all questions in the active section
                            angular.forEach($scope.activeSection.sectionQuestions, function (sectionQuestion) {
                                var template = "";

                                switch (sectionQuestion.question.type) {
                                    case "MultipleChoiceQuestion":
                                        template = $scope.multipleChoiseOptionTemplate;
                                        break;
                                    case "EssayQuestion":
                                        template = $scope.essayQuestionTemplate;
                                        break;
                                    default:
                                        template = "fa-question-circle";
                                        break;
                                }
                                sectionQuestion.question.template = template;

                                sectionQuestion.question.expanded = false;
                                $scope.setQuestionColors(sectionQuestion);
                            });
                            $scope.switchToGuide(true);
                            $scope.switchButtons($scope.doexam.examSections[0]);
                        }).
                        error(function (data, status, headers, config) {
                            // called asynchronously if an error occurs
                            // or server returns response with an error status.
                        });
                };

                $scope.previewExam();


                $scope.setActiveSection = function (section) {
                    $scope.activeSection = section;
                    $scope.switchButtons(section);

                    // Loop through all questions in the active section
                    angular.forEach($scope.activeSection.sectionQuestions, function (sectionQuestion, index) {

                        var template = "";
                        switch (sectionQuestion.question.type) {
                            case "MultipleChoiceQuestion":
                                template = $scope.multipleChoiseOptionTemplate;

//                                console.log("asd: "+ question.answer.option);

                                break;
                            case "EssayQuestion":
                                template = $scope.essayQuestionTemplate;
                                break;
                            default:
                                template = "fa-question-circle";
                                break;
                        }
                        sectionQuestion.question.template = template;

                        if(!sectionQuestion.question.expanded) {
                            sectionQuestion.question.expanded = false;
                        }
                        $scope.setQuestionColors(sectionQuestion);
                    });
                };

                $scope.setPreviousSection = function (exam, active_section) {
//                    var sectionCount = exam.examSections.length;

                    if(!$scope.guide) {
                        // Loop through all sections in the exam
                        angular.forEach(exam.examSections, function (section, index) {
                            // If section is same as the active_section
                            if (angular.equals(section, active_section)) {
                                // If this is the first element in the array
                                if (index == 0) {
                                    $scope.switchToGuide(true);
                                    $scope.setActiveSection(exam.examSections[0]);
                                }
                                else {
                                    $scope.setActiveSection(exam.examSections[index - 1]);
                                }
                            }
                        });
                    }
                };

                $scope.setNextSection = function (exam, active_section) {
                    var sectionCount = exam.examSections.length;

                    if($scope.guide) {
                        $scope.switchToGuide(false);
                        $scope.setActiveSection(exam.examSections[0]);
                    } else {
                        // Loop through all sections in the exam
                        angular.forEach(exam.examSections, function (section, index) {
                            // If section is same as the active_section
                            if (angular.equals(section, active_section)) {
                                // If this is the last element in the array
                                if (index == sectionCount - 1) {
                                } else {
                                    $scope.setActiveSection(exam.examSections[index + 1]);
                                }
                            }
                        });
                    }
                };

                // Called when the exit button is clicked
                $scope.exitPreview = function () {
                    $location.path("/exams/" + $routeParams.id);
                };

                // Called when a radiobutton is selected
                $scope.radioChecked = function (doexam, question, option) {
                    question.answered = true;
                    question.questionStatus = $translate("sitnet_question_answered");


                };

                $scope.printExamDuration = function(exam) {

                    if (exam && exam.duration) {
                        var h = Math.floor(exam.duration / 60);
                        var m = exam.duration % 60;
                        if (h === 0) {
                            return m + "min";
                        } else if (m === 0) {
                            return h + "h ";
                        } else {
                            return h + "h " + m + "min";
                        }
                    } else {
                        return "";
                    }
                };

                $scope.remainingTime = 0;
                $scope.onTimeout = function(){
                    $scope.remainingTime++;
                    $timeout($scope.onTimeout,1000);
                }
                $timeout($scope.onTimeout,1000);


                // Called when the chevron is clicked
                $scope.chevronClicked = function (sectionQuestion) {
                    $scope.setQuestionColors(sectionQuestion);
                };

                $scope.isAnswer = function (question, option) {

                    if(question.answer === null)
                        return false;
                    else if(question.answer.option === null)
                        return false;
                    else if(option.option === question.answer.option.option)
                        return true;
                };

                $scope.setQuestionColors = function(sectionQuestion) {
                    // State machine for resolving how the question header is drawn
                    if (sectionQuestion.question.answered) {

                        sectionQuestion.question.questionStatus = $translate("sitnet_question_answered");

                        if (sectionQuestion.question.expanded) {
                            sectionQuestion.question.selectedAnsweredState = 'question-active-header';
                        } else {
                            sectionQuestion.question.selectedAnsweredState = 'question-answered-header';
                        }
                    } else {

                        sectionQuestion.question.questionStatus = $translate("sitnet_question_unanswered");

                        if (sectionQuestion.question.expanded) {
                            sectionQuestion.question.selectedAnsweredState = 'question-active-header';
                        } else {
                            sectionQuestion.question.selectedAnsweredState = 'question-unanswered-header';
                        }
                    }
                };
            }]);
}());