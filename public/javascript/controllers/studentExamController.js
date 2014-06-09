(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('StudentExamController', ['$scope', '$sce', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'StudentExamRes', 'QuestionRes',
            function ($scope, $sce, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, StudentExamRes, QuestionRes) {

                $scope.sectionsBar = SITNET_CONF.TEMPLATES_PATH + "student/student_sections_bar.html";
                $scope.multipleChoiseOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/multiple_choice_option.html";
                $scope.essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/essay_question.html";
                $scope.sectionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/section_template.html";

//                $scope.exams = StudentExamRes.exams.query();
                $scope.tempQuestion = null;

                $scope.countCharacters = function (question) {
                    question.answer.answerLength = question.answer.answer.length;
                    question.words = question.answer.answer.split(" ").length;
                };

                $scope.doExam = function (hash) {
                    $http.get('/student/doexam/' + $routeParams.hash)
                        .success(function (data, status, headers, config) {
                            $scope.doexam = data;
                            $scope.activeSection = $scope.doexam.examSections[0];

                            // set sections and question nubering
                            angular.forEach($scope.doexam.examSections, function (section, index) {
                                section.index = index +1;

                                angular.forEach(section.questions, function (question, index) {
                                    question.index = index +1;
                                });
                            });

                                // Loop through all questions in the active section
                            angular.forEach($scope.activeSection.questions, function (question, index) {
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
                                if (question.expanded) {
                                    question.selectedAnsweredState = 'question-active-header';

                                    if (!question.answer) {
                                        question.questionStatus = $translate("sitnet_question_unanswered");
                                    } else {
                                        question.questionStatus = $translate("sitnet_question_answered");
                                    }
                                }
                                else {
                                    if (!question.answer) {
                                        // When question is folded and has not been answered it's status color is set to gray
                                        question.selectedAnsweredState = 'question-unanswered-header';
                                        question.questionStatus = $translate("sitnet_question_unanswered");
                                    } else {
                                        // When question is folded and has not been answered it's status color is set to green
                                        question.selectedAnsweredState = 'question-answered-header';
                                        question.questionStatus = $translate("sitnet_question_answered");
                                    }
                                }
                            })
                        }).
                        error(function (data, status, headers, config) {
                            // called asynchronously if an error occurs
                            // or server returns response with an error status.
                        });
                }
                if ($routeParams.hash != undefined)
                    $scope.doExam();

                $scope.activateExam = function (exam) {
                    $scope.doexam = exam;
                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/terms_of_use.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "ModalInstanceCtrl"
                    });

                    modalInstance.result.then(function () {
                        $http.get('/student/doexam/' + $scope.doexam.hash)
                            .success(function (clonedExam) {
                                $scope.clonedExam = clonedExam;
                                $location.path('/student/doexam/' + clonedExam.hash);
                            }).
                            error(function (error) {
                                console.log('Error happened: ' + error);
                            });
                    }, function () {
                        console.log('Modal dismissed at: ' + new Date());
                    });
                };

                $scope.continueExam = function (exam) {
                    $http.get('/student/doexam/' + exam.hash)
                        .success(function (clonedExam) {
                            $scope.clonedExam = clonedExam;
                            $location.path('/student/doexam/' + clonedExam.hash);
                        }).
                        error(function (error) {
                            console.log('Error happened: ' + error);
                        });
                }

                $scope.setActiveSection = function (section) {
                    $scope.activeSection = section;

                    // Loop through all questions in the active section
                    angular.forEach($scope.activeSection.questions, function (question, index) {

                        var template = "";
                        switch (question.type) {
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
                        question.template = template;

                        if (question.expanded == null) {
                            question.expanded = true;
                        }

                        if (question.expanded) {
                            question.selectedAnsweredState = 'question-active-header';

                            if (!question.answer) {
                                question.questionStatus = $translate("sitnet_question_unanswered");
                            } else {
                                question.questionStatus = $translate("sitnet_question_answered");
                            }
                        }
                        else {
                            if (!question.answer) {
                                // When question is folded and has not been answered it's status color is set to gray
                                question.selectedAnsweredState = 'question-unanswered-header';
                                question.questionStatus = $translate("sitnet_question_unanswered");
                            } else {
                                // When question is folded and has not been answered it's status color is set to green
                                question.selectedAnsweredState = 'question-answered-header';
                                question.questionStatus = $translate("sitnet_question_answered");
                            }
                        }
                    })
                };

                $scope.setPreviousSection = function (exam, active_section) {
                    var sectionCount = exam.examSections.length;

                    // Loop through all sections in the exam
                    angular.forEach(exam.examSections, function (section, index) {
                        // If section is same as the active_section
                        if (angular.equals(section, active_section)) {
                            // If this is the first element in the array
                            if (index == 0) {
                                var section = exam.examSections[sectionCount-1];
//                                $scope.setActiveSection(exam.examSections[sectionCount]);
                                $scope.setActiveSection(section);
                            }
                            else {
                                $scope.setActiveSection(exam.examSections[index-1]);
                            }
                        }
                    })
                }

                $scope.setNextSection = function (exam, active_section) {
                    var sectionCount = exam.examSections.length;

                    // Loop through all sections in the exam
                    angular.forEach(exam.examSections, function (section, index) {
                        // If section is same as the active_section
                        if (angular.equals(section, active_section)) {
                            // If this is the last element in the array
                            if (index == sectionCount-1) {
                                // Jump to the beginning of the array
                                var section = exam.examSections[0];
                                $scope.setActiveSection(section);
                            } else {
                                $scope.setActiveSection(exam.examSections[index+1]);
                            }
                        }
                    })
                }

                // Called when the save and exit button is clicked
                $scope.saveExam = function (doexam) {
                    StudentExamRes.exams.update({id: doexam.id}, function () {
                        toastr.info("Tentti lähetettiin tarkastettavaksi.");
                        $location.path("/home/");

                    }, function () {
                        toastr.error(error.data);
                    });
                };

                // Called when the abort button is clicked
                $scope.abortExam = function (doexam) {
                    StudentExamRes.exam.abort({id: doexam.id}, {data: doexam}, function () {
                        toastr.info("Tentti keskeytettiin.");
                        $location.path("/home/");

                    }, function () {
                        toastr.error(error.data);
                    });
                };

                // Called when a radiobutton is selected
                $scope.radioChecked = function (doexam, question, option) {
                    question.answered = true;
                    question.questionStatus = $translate("sitnet_question_answered");

                    StudentExamRes.multipleChoiseAnswer.saveMultipleChoice({hash: doexam.hash, qid: question.id, oid: option.id},
                        function (updated_answer) {
                        question.answer = updated_answer;
                        toastr.info("Vastaus lisätty kysymykseen.");
                    }, function () {
                        toastr.error(error.data);
                    });
                };

                $scope.saveEssay = function (question, answer) {
                	question.answered = true;
                	question.questionStatus = $translate("sitnet_question_answered");
                	
                    var params = {
                        hash: $scope.doexam.hash,
                        qid: question.id
                    };
                    var msg = {};
                    msg.answer = answer;
                    StudentExamRes.essayAnswer.saveEssay(params, msg, function () {
                        toastr.info("Vastaus lisätty kysymykseen.");
                    }, function () {
                        toastr.error(error.data);
                    });
                };



                $scope.remainingTime = 0;
                $scope.onTimeout = function(){
                    $scope.remainingTime++;
                    $timeout($scope.onTimeout,1000);
                }
                $timeout($scope.onTimeout,1000);


                // Called when the chevron is clicked
                $scope.chevronClicked = function (question) {

                    if (question.type == "EssayQuestion") {

                    }

                    // State machine for resolving how the question header is drawn
                    if (question.answered) {
                        if (question.expanded) {
                            question.selectedAnsweredState = 'question-answered-header';
                        } else {
                            question.selectedAnsweredState = 'question-active-header';
                        }
                    } else {
                        if (question.expanded) {
                            question.selectedAnsweredState = 'question-unanswered-header';
                        } else {
                            question.selectedAnsweredState = 'question-active-header';
                        }
                    }
                };

                $scope.isAnswer = function (question, option) {

                    if(question.answer === null)
                        return false;
                    else if(question.answer.option === null)
                        return false;
                    else if(option.option === question.answer.option.option)
                        return true;
                };

            }]);
}());