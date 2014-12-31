(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('QuestionCtrl', ['$scope', '$http', '$modal', '$routeParams', '$location', '$translate', 'QuestionRes', 'ExamRes', 'SITNET_CONF',
            function($scope, $http, $modal, $routeParams, $location, $translate, QuestionRes, ExamRes, SITNET_CONF) {

                $scope.newOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/multiple_choice_option.html";

                var essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/essay_question.html";
                var multiChoiceQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "question-editor/multiple_choice_question.html";

                $scope.questionTemplate = null;
                $scope.returnURL = null;

                var qid = $routeParams.editId || $routeParams.id;

                QuestionRes.questions.get({id: qid},
                    function(question) {
                        $scope.newQuestion = question;
                        $scope.setQuestionType();
                        if ($routeParams.editId == undefined && $scope.newQuestion.evaluationType == 'Select') {
                            $scope.newQuestion.maxScore = undefined; // will screw up validation otherwise
                        }
                    },
                    function(error) {
                        toastr.error(error.data);
                    }
                );

                $scope.setQuestionType = function() {
                    switch ($scope.newQuestion.type) {
                        case 'EssayQuestion':
                            $scope.questionTemplate = essayQuestionTemplate;
                            $scope.newQuestion.evaluationType = $scope.newQuestion.evaluationType || "Points";
                            $scope.estimateWords();
                            break;

                        case 'MultipleChoiceQuestion':
                            $scope.questionTemplate = multiChoiceQuestionTemplate;
                            $scope.newQuestion.type = "MultipleChoiceQuestion";
                            break;
                    }
                };

                $scope.estimateWords = function() {
                    $scope.newQuestion.words = Math.ceil($scope.newQuestion.maxCharacters / 7.5) || 0;
                    return $scope.newQuestion.words;
                };

                var update = function() {
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
                            questionToUpdate.options = $scope.newQuestion.options;
                            break;
                    }
                    QuestionRes.questions.update({id: $scope.newQuestion.id}, questionToUpdate,
                        function() {
                            toastr.info($translate("sitnet_question_saved"));
                        }, function(error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.deleteQuestion = function() {
                    if (confirm($translate('sitnet_remove_question'))) {
                        QuestionRes.questions.delete({'id': $scope.newQuestion.id}, function() {
                            toastr.info($translate('sitnet_question_removed'));
                            if ($routeParams.examId === undefined) {
                                $location.path("/questions/");
                            } else {
                                $location.path("/exams/" + $routeParams.examId);
                            }
                        });
                    }
                };

                $scope.saveQuestion = function() {

                    update();

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
                        var params = {
                            eid: $routeParams.examId,
                            sid: $routeParams.sectionId,
                            qid: $scope.newQuestion.id,
                            seq: $routeParams.seqId
                        };
                        ExamRes.sectionquestions.insert(params, function() {
                                toastr.info($translate("sitnet_question_added_to_section"));
                        }, function(error) {
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.updateEvaluationType = function() {
                    if ($scope.newQuestion.evaluationType === 'Select') {
                        $scope.newQuestion.maxScore = undefined;
                    }
                    $scope.updateQuestion();
                };

                $scope.updateQuestion = function() {
                    update();
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

                    angular.forEach($scope.newQuestion.options, function(value) {
                        if (value.id != option.id) {
                            value.correctOption = false;
                        }
                    })
                };

                $scope.removeOption = function(option) {

                    QuestionRes.options.delete({qid: null, oid: option.id},
                        function() {
                            $scope.newQuestion.options.splice($scope.newQuestion.options.indexOf(option), 1);
                            toastr.info($translate('sitnet_option_removed'));
                        }, function(error) {
                            toastr.error(error.data);
                        }
                    );

                };


                $scope.updateOption = function(option) {
                    QuestionRes.options.update({oid: option.id}, option,
                        function() {
                            toastr.info($translate('sitnet_option_updated'));
                        }, function(error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.correctAnswerToggled = function(optionId, newQuestion) {

                    angular.forEach(newQuestion.options, function(option) {
                        // This is the option that was clicked
                        if (option.id == optionId) {
                            // If the correct is false then switch it to true, otherwise do nothing
                            if (option.correctOption === false) {
                                option.correctOption = true;

                                QuestionRes.options.update({oid: optionId}, option,
                                    function() {
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
                                    }, function(error) {
                                        toastr.error(error.data);
                                    }
                                );
                            }
                        }
                    });
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

                    modalInstance.result.then(function() {
                        // OK button
                        $location.path('/questions/' + $scope.newQuestion.id);
                    }, function() {
                        // Cancel button
                    });
                };


            }]);
}());
