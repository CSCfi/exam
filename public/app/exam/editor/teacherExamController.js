(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('TeacherExamController', ['$scope', '$sce', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'dateService', 'examService',
            function ($scope, $sce, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, dateService, examService) {

                $scope.multipleChoiseOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "question/student/multiple_choice_option.html";
                $scope.essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "question/student/essay_question.html";
                $scope.sectionTemplate = SITNET_CONF.TEMPLATES_PATH + "exam/student/section_template.html";

                $scope.pages = ["guide"];

                //$scope.exams = StudentExamRes.exams.query();
                $scope.tempQuestion = null;
                $scope.previewSwitch = true;

                $scope.getQuestionAmount = function (section, type) {
                    if(type === 'total') {
                        return section.sectionQuestions.length;
                    } else if(type === 'answered') {
                        return section.sectionQuestions.filter(function (sectionQuestion) {
                            return sectionQuestion.question.answered;
                        }).length;
                    } else if(type === 'unanswered') {
                        return section.sectionQuestions.length - section.sectionQuestions.filter(function (sectionQuestion) {
                            return sectionQuestion.question.answered;
                        }).length;
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

                                examService.setQuestionColors(question);
                            });

                            $scope.currentLanguageText = "Room instructions";

                            if ($scope.doexam.instruction && $scope.doexam.instruction.length > 0) {
                                $scope.guide = true;
                                $scope.setActiveSection("guide");
                            } else {
                                $scope.pages.splice(0, 1);
                                $scope.setActiveSection($scope.pages[0]);
                            }

                        }).
                        error(function (data, status, headers, config) {
                            // called asynchronously if an error occurs
                            // or server returns response with an error status.
                        });
                };

                $scope.saveEssay = function (question, answer) {
                    if(answer) {
                        question.answered = true;
                        question.questionStatus = $translate("sitnet_answer_saved");
                        examService.setQuestionColors(question);
                    }
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

                    if (sectionName !== "guide" || ($scope.doexam.instruction && $scope.doexam.instruction.length > 0 && sectionName === "guide")) {

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
                            if($scope.pages.indexOf(sectionName) - 1 !== 0) {
                                $scope.previousButtonText = $scope.pages[$scope.pages.indexOf(sectionName) - 1];
                            } else {
                                $scope.previousButtonText = $translate("sitnet_exam_quide");
                            }

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
                    if (sectionName === "guide") {
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
                            examService.setQuestionColors(question);
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
                    examService.setQuestionColors(question);
                };

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                // Called when the chevron is clicked
                $scope.chevronClicked = function (sectionQuestion) {
                    examService.setQuestionColors(sectionQuestion);
                };

                $scope.isAnswer = function (question, option) {

                    if (question.answer === null)
                        return false;
                    else if (question.answer.option === null)
                        return false;
                    else if (option.option === question.answer.option.option)
                        return true;
                };

            }]);
}());