(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('TeacherExamController', ['$scope', '$sce', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'dateService',
            function ($scope, $sce, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, dateService) {

                $scope.multipleChoiseOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/multiple_choice_option.html";
                $scope.essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/essay_question.html";
                $scope.sectionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/section_template.html";

                $scope.pages = [$translate("sitnet_exam_quide")];

                //$scope.exams = StudentExamRes.exams.query();
                $scope.tempQuestion = null;
                $scope.previewSwitch = true;

                $scope.switchButtons = function (section) {

                    var i = section.index - 1;

                    if ($scope.doexam.examSections[i - 1]) {
                        $scope.previousButton = true;
                        $scope.previousButtonText = $scope.doexam.examSections[i - 1].index + ". " + $scope.doexam.examSections[i - 1].name;
                    } else {
                        $scope.previousButton = true;
                        $scope.previousButtonText = $translate("sitnet_exam_quide");
                    }

                    if (i == 0 && $scope.guide) {
                        $scope.nextButton = true;
                        $scope.nextButtonText = $scope.doexam.examSections[0].index + ". " + $scope.doexam.examSections[0].name;
                    } else if (!$scope.guide && $scope.doexam.examSections[i + 1]) {
                        $scope.nextButton = true;
                        $scope.nextButtonText = $scope.doexam.examSections[i + 1].index + ". " + $scope.doexam.examSections[i + 1].name;
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

                            // set sections and question numbering
                            angular.forEach($scope.doexam.examSections, function (section, index) {
                                section.index = index + 1;
                                $scope.pages.push(section.name);
                                angular.forEach(section.sectionQuestions, function (sectionQuestion, index) {
                                    sectionQuestion.question.index = index + 1; // Where is this really used?
                                });
                            });

                            // Loop through all questions in the active section
                            angular.forEach($scope.activeSection.sectionQuestions, function (sectionQuestion) {
                                var question = sectionQuestion.question;
                                var template = "";
                                switch (question.type) {
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
                                question.template = template;

                                question.expanded = false;

                                $scope.setQuestionColors(question);
                            });

                            $scope.currentLanguageText = "Room instructions";

                            if ($scope.doexam.instruction && $scope.doexam.instruction.length > 0) {
                                $scope.guide = true;
                                $scope.setActiveSection($translate("sitnet_exam_quide"));
                            } else {
                                $scope.pages.splice(0, 1);
                                $scope.setActiveSection($scope.pages[0]);
                                $scope.activeSection.autosaver = getAutosaver();
                            }

                        }).
                        error(function (data, status, headers, config) {
                            // called asynchronously if an error occurs
                            // or server returns response with an error status.
                        });
                };

                $scope.previewExam();

                $scope.guide = false;
                $scope.previousButton = false;
                $scope.previousButtonText = "";
                $scope.nextButton = false;
                $scope.nextButtonText = "";

                $scope.setNextSection = function () {
                    if ($scope.guide) {
                        $scope.setActiveSection($scope.pages[1]);
                    } else {
                        $scope.setActiveSection($scope.pages[$scope.pages.indexOf($scope.activeSection.name) + 1]);
                    }
                };

                $scope.setPreviousSection = function () {
                    if (!$scope.guide) {
                        $scope.setActiveSection($scope.pages[$scope.pages.indexOf($scope.activeSection.name) - 1]);
                    }
                };

                $scope.setActiveSection = function (sectionName) {

                    if (sectionName !== $translate("sitnet_exam_quide") || ($scope.doexam.instruction && $scope.doexam.instruction.length > 0 && sectionName === $translate("sitnet_exam_quide"))) {

                        // next
                        if ($scope.pages[$scope.pages.indexOf(sectionName) + 1]) {
                            $scope.nextButton = true;
                            $scope.nextButtonText = $scope.pages[$scope.pages.indexOf(sectionName) + 1];
                        } else {
                            $scope.nextButton = false;
                            $scope.nextButtonText = "";
                        }

                        // previous
                        if ($scope.pages[$scope.pages.indexOf(sectionName) - 1]) {
                            $scope.previousButton = true;
                            $scope.previousButtonText = $scope.pages[$scope.pages.indexOf(sectionName) - 1];
                        } else {
                            $scope.previousButton = false;
                            $scope.previousButtonText = "";
                        }


                    } else {
                        $scope.guide = true;
                        $scope.nextButton = true;
                        $scope.nextButtonText = $scope.pages[1];
                        $scope.previousButton = false;
                        $scope.previousButtonText = "";
                    }

                    $scope.activeSection = undefined;
                    if (sectionName === $translate("sitnet_exam_quide")) {
                        $scope.guide = true;
                    } else {
                        $scope.guide = false;

                        angular.forEach($scope.doexam.examSections, function (section, index) {
                            if (sectionName === section.name) {
                                $scope.activeSection = section;
                            }
                        });
                    }

                    if ($scope.activeSection !== undefined) {
                        // Loop through all questions in the active section
                        angular.forEach($scope.activeSection.sectionQuestions, function (sectionQuestion) {
                            var question = sectionQuestion.question;
                            var template = "";
                            switch (question.type) {
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
                            question.template = template;

                            if (question.expanded == null) {
                                question.expanded = true;
                            }

                            $scope.setQuestionColors(question);
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

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                // Called when the chevron is clicked
                $scope.chevronClicked = function (sectionQuestion) {
                    $scope.setQuestionColors(sectionQuestion);
                };

                $scope.isAnswer = function (question, option) {

                    if (question.answer === null)
                        return false;
                    else if (question.answer.option === null)
                        return false;
                    else if (option.option === question.answer.option.option)
                        return true;
                };

                $scope.setQuestionColors = function (question) {
                    // State machine for resolving how the question header is drawn
                    if (question.answered || question.answer) {
                        question.answered = true;
                        question.questionStatus = $translate("sitnet_question_answered");

                        if (question.expanded) {
                            question.selectedAnsweredState = 'question-active-header';
                        } else {
                            question.selectedAnsweredState = 'question-answered-header';
                        }
                    } else {

                        question.questionStatus = $translate("sitnet_question_unanswered");

                        if (question.expanded) {
                            question.selectedAnsweredState = 'question-active-header';
                        } else {
                            question.selectedAnsweredState = 'question-unanswered-header';
                        }
                    }
                };
            }]);
}());