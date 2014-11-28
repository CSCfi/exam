(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('QuestionCtrl', ['$scope', '$http', '$modal', '$routeParams', '$location', '$translate', 'QuestionRes', 'ExamRes', 'sessionService', 'SITNET_CONF',
            function($scope, $http, $modal, $routeParams, $location, $translate, QuestionRes, ExamRes, sessionService, SITNET_CONF) {

                $scope.libraryTemplate = SITNET_CONF.TEMPLATES_PATH + "library/library.html";
                $scope.newOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/multiple_choice_option.html";
                $scope.multipleChoiseOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/multiple_choice_question.html";
                $scope.essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/essay_question.html";

                $scope.questionListingMultipleChoice = SITNET_CONF.TEMPLATES_PATH + "question-listing/multiplechoice_questions.html";
                $scope.questionListingEssay = SITNET_CONF.TEMPLATES_PATH + "question-listing/essay_questions.html";

                $scope.questionTemplate = null;
                $scope.returnURL = null;

                $scope.questionTypes = {
                    MultipleChoiceQuestion: 'Monivalinta yksi oikein',
                    EssayQuestion: 'Essee'
                };
                $scope.answerState = "";

                if ($routeParams.editId) {
                    QuestionRes.questions.get({id: $routeParams.editId},
                        function(question) {
                            $scope.newQuestion = question;
                            $scope.setQuestionType();
                        },
                        function(error) {
                            toastr.error(error.data);
                        }
                    );
                } else if ($routeParams.id === undefined) {
                    $scope.questions = QuestionRes.questions.query();
                } else {
                    QuestionRes.questions.get({id: $routeParams.id},
                        function(value) {
                            $scope.newQuestion = value;
                            $scope.setQuestionType();
                            if ($scope.newQuestion.evaluationType == 'Select') {
                                $scope.newQuestion.maxScore = undefined;
                            }
                        },
                        function(error) {
                            toastr.error(error.data);
                        }
                    );
                }

                $scope.setQuestionType = function() {
                    switch ($scope.newQuestion.type) {
                        case 'EssayQuestion':
                            $scope.questionTemplate = $scope.essayQuestionTemplate;
                            $scope.newQuestion.evaluationType = $scope.newQuestion.evaluationType || "Points";
                            $scope.estimateWords();
                            break;

                        case 'MultipleChoiceQuestion':
                            $scope.questionTemplate = $scope.multipleChoiseOptionTemplate;
                            $scope.newQuestion.type = "MultipleChoiceQuestion";
                            break;
                    }
                }
//                http://draptik.github.io/blog/2013/07/28/restful-crud-with-angularjs/
                $scope.createQuestion = function(type) {
                    var newQuestion = {
                        type: type
//                        question: $translate("sitnet_question_write_name")
                    }

                    if ($routeParams.examId === undefined) {
                        QuestionRes.questions.create(newQuestion,
                            function(response) {
                                toastr.info($translate("sitnet_question_added"));
                                $location.path("/questions/" + response.id);
                            }, function(error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                    else {
                        QuestionRes.questions.create(newQuestion,
                            function(response) {
                                toastr.info($translate("sitnet_question_added"));
                                $location.path("/exams/" + $routeParams.examId);
                            }, function(error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                };

                $scope.createQuestionLibrary = function() {
                    toastr.info("Toimintoa ei ole vielä toteutettu");
                };

                $scope.copyQuestion = function(question) {

                    QuestionRes.question.copy(question,
                        function(questionCopy) {
                            toastr.info($translate("sitnet_question_copied"));
                            $location.path("/questions/" + questionCopy.id);
                        }, function(error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.estimateWords = function() {
                    $scope.newQuestion.words = Math.ceil($scope.newQuestion.maxCharacters / 7.5) || 0;
                    return $scope.newQuestion.words;
                };

                $scope.saveQuestion = function() {

                    // common to all type of questions
                    var questionToUpdate = {
                        "id": $scope.newQuestion.id,
                        "type": $scope.newQuestion.type,
                        "maxScore": $scope.newQuestion.maxScore,
                        "question": $scope.newQuestion.question,
                        "shared": $scope.newQuestion.shared,
                        "instruction": $scope.newQuestion.instruction,
                        "evaluationCriterias": $scope.newQuestion.evaluationCriterias
                    };

                    // update question specific attributes
                    switch (questionToUpdate.type) {
                        case 'EssayQuestion':
                            questionToUpdate.maxCharacters = $scope.newQuestion.maxCharacters;
                            questionToUpdate.evaluationType = $scope.newQuestion.evaluationType;
                            break;

                        case 'MultipleChoiceQuestion':

                            break;
                    }

                    QuestionRes.questions.update({id: $scope.newQuestion.id}, questionToUpdate,
                        function(response) {
                            toastr.info($translate("sitnet_question_saved"));
                        }, function(error) {
                            toastr.error(error.data);
                        }
                    );

                    //Set return URL pointing back to questions main page if we created question there
                    if ($routeParams.examId === undefined) {
                        $scope.returnURL = "/questions/";
                    }
                    //Set return URL to exam, if we created the new question there
                    //Also bind the question to section of the exam at this point
                    else if ($routeParams.editId) {
                        $scope.returnURL = "/exams/" + $routeParams.examId
                    }
                    //Set return URL to exam, if we created the new question there
                    //Also bind the question to section of the exam at this point
                    else {
                        $scope.returnURL = "/exams/" + $routeParams.examId;
                        ExamRes.questions.insert({eid: $routeParams.examId, sid: $routeParams.sectionId, qid: $scope.newQuestion.id}, function(section) {
                            toastr.info($translate("sitnet_question_added_to_section"));
                        }, function(error) {
                            toastr.error(error.data);
                        })
                    }
                };

                $scope.updateEvaluationType = function() {
                    if ($scope.newQuestion.evaluationType === 'Select') {
                        $scope.newQuestion.maxScore = undefined;
                    }
                    $scope.updateQuestion();
                };


                $scope.updateQuestion = function() {

                    // common to all type of questions
                    var questionToUpdate = {
                        "id": $scope.newQuestion.id,
                        "type": $scope.newQuestion.type,
                        "maxScore": $scope.newQuestion.maxScore,
                        "question": $scope.newQuestion.question,
                        "shared": $scope.newQuestion.shared,
                        "instruction": $scope.newQuestion.instruction,
                        "evaluationCriterias": $scope.newQuestion.evaluationCriterias
                    };

                    // update question specific attributes
                    switch (questionToUpdate.type) {
                        case 'EssayQuestion':
                            questionToUpdate.maxCharacters = $scope.newQuestion.maxCharacters;
                            questionToUpdate.evaluationType = $scope.newQuestion.evaluationType;
                            break;

                        case 'MultipleChoiceQuestion':
                            break;
                    }
                    ;

                    QuestionRes.questions.update({id: $scope.newQuestion.id}, questionToUpdate,
                        function(response) {
                            toastr.info($translate("sitnet_question_saved"));
                        }, function(error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.deleteQuestion = function(question) {
                    if (confirm($translate("sitnet_remove_question"))) {
                        $scope.questions.splice($scope.questions.indexOf(question), 1);

                        QuestionRes.questions.delete({'id': question.id}), function() {
                            toastr.info($translate("sitnet_question_removed"));
                        };
                    }
                };

                $scope.addNewOption = function(newQuestion) {

                    var option_description = $translate('sitnet_default_option_description');

                    var option = {
                        "option": option_description,
                        "correctOption": false,
                        "score": 1
                    };

                    QuestionRes.options.create({qid: newQuestion.id}, option,
                        function(response) {
                            newQuestion.options.push(response);
                            toastr.info($translate('sitnet_option_added'));
                        }, function(error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.radioChecked = function(option) {
                    option.correctOption = true;

                    var checkbox = document.getElementById(option.id);

                    angular.forEach($scope.newQuestion.options, function(value, index) {
                        if (value.id != option.id) {
                            value.correctOption = false;
                        }
                    })
                };

                $scope.removeOption = function(option) {

                    QuestionRes.options.delete({qid: null, oid: option.id},
                        function(response) {
                            $scope.newQuestion.options.splice($scope.newQuestion.options.indexOf(option), 1);
                            toastr.info($translate('sitnet_option_removed'));
                        }, function(error) {
                            toastr.error(error.data);
                        }
                    );

                }

                $scope.editQuestion = function(question) {

                }

                $scope.updateOption = function(option) {
                    QuestionRes.options.update({oid: option.id}, option,
                        function(response) {
                            toastr.info($translate('sitnet_option_updated'));
                        }, function(error) {
                            toastr.error(error.data);
                        }
                    );
                }

                $scope.correctAnswerToggled = function(optionId, newQuestion) {

                    angular.forEach(newQuestion.options, function(option) {
                        // This is the option that was clicked
                        if (option.id == optionId) {
                            // If the correct is false then switch it to true, otherwise do nothing
                            if (option.correctOption === false) {
                                option.correctOption = true;

                                QuestionRes.options.update({oid: optionId}, option,
                                    function(response) {
                                        toastr.info($translate('sitnet_correct_option_updated'));
                                    }, function(error) {
                                        toastr.error(error.data);
                                    }
                                );
                            }
                        } else {
                            // Check for true values in other options than that was clicked and if found switch them to false
                            if (option.correctOption === true) {
                                option.correctOption = false;

                                QuestionRes.options.update({oid: optionId}, option,
                                    function(response) {
//                                        toastr.info("Edellinen oikea vaihtoehto päivitetty");
                                    }, function(error) {
                                        toastr.error(error.data);
                                    }
                                );
                            }
                        }
                    })

                    // Save changes to database

                };

                $scope.selectFile = function() {

                    var question = $scope.newQuestion;

                    var ctrl = function($scope, $modalInstance) {

                        $scope.newQuestion = question;

                        $scope.submit = function(question) {

                            var file = $scope.attachmentFile;
                            var url = "attachment/question";
                            //$scope.fileUpload.uploadAttachment(file, url);
                            var fd = new FormData();
                            fd.append('file', file);
                            fd.append('questionId', question.id);
                            $http.post(url, fd, {
                                transformRequest: angular.identity,
                                headers: {'Content-Type': undefined}
                            })
                                .success(function(attachment) {
                                    $modalInstance.dismiss();
                                    question.attachment = attachment;
                                })
                                .error(function(error) {
                                    $modalInstance.dismiss();
                                    toastr.error(error);
                                });
                        };
                        // Cancel button is pressed in the modal dialog
                        $scope.cancel = function() {
                            $modalInstance.dismiss('Canceled');
                        };
                    };

                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/question-editor/dialog_question_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl
                    });

                    modalInstance.result.then(function(resp) {
                        // OK button
                        $location.path('/questions/' + $scope.newQuestion.id);
                    }, function() {
                        // Cancel button
                    });
                };


            }]);
}());
