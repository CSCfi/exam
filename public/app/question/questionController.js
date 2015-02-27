(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .factory('focus', function ($rootScope, $timeout) {
            return function (name) {
                $timeout(function () {
                    $rootScope.$broadcast('focusOn', name);
                });
            };
        })

        .controller('QuestionCtrl', ['$rootScope', '$scope', '$q', '$http', '$modal', '$routeParams', '$location', '$translate', 'focus', 'QuestionRes', 'ExamRes', 'TagRes', 'SITNET_CONF',
            function ($rootScope, $scope, $q, $http, $modal, $routeParams, $location, $translate, focus, QuestionRes, ExamRes, TagRes, SITNET_CONF) {

                $scope.newOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "question/editor/multiple_choice_option.html";

                var essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "question/editor/essay_question.html";
                var multiChoiceQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "question/editor/multiple_choice_question.html";

                $scope.questionTemplate = null;
                $scope.returnURL = null;

                $scope.examNames = [];
                $scope.sectionNames = [];

                var qid = $routeParams.editId || $routeParams.id;

                function isInArray(array, search) {
                    return array.indexOf(search) >= 0;
                }


                QuestionRes.questions.get({id: qid},
                    function (question) {
                        $scope.newQuestion = question;
                        $scope.setQuestionType();
                        if ($scope.newQuestion.evaluationType && $scope.newQuestion.evaluationType === 'Select') {
                            $scope.newQuestion.maxScore = undefined; // will screw up validation otherwise
                        }

                        if ($routeParams.examId) {
                            ExamRes.exams.get({id: $routeParams.examId},
                                function (exam) {

                                    if (exam.name) {
                                        var code = "";
                                        if (exam.course != undefined && exam.course.code != undefined) {
                                            code = " (" + exam.course.code + ")";
                                        }
                                        if(! isInArray($scope.examNames , exam.name + code)) {
                                            $scope.examNames .push(exam.name + code);
                                        }
                                    }
                                    if (exam.examSections && exam.examSections.length > 0) {

                                        angular.forEach(exam.examSections, function (section) {
                                            if (section.id == $routeParams.sectionId) {
                                                if(! isInArray($scope.sectionNames, section.name)) {
                                                    $scope.sectionNames.push(section.name);
                                                }
                                            }
                                        });
                                    }
                                },
                                function (error) {
                                    toastr.error(error.data);
                                }
                            );

                        } else {
                            QuestionRes.metadata.get({id: qid}, function (result) {

                                    angular.forEach(result, function (question) {
                                        if (question.examSectionQuestion && question.examSectionQuestion.examSection && question.examSectionQuestion.examSection.exam.name && ! isInArray($scope.examNames, question.examSectionQuestion.examSection.exam.name)) {
                                            var code = "";
                                            if (question.examSectionQuestion.examSection.exam.course != undefined && question.examSectionQuestion.examSection.exam.course.code != undefined) {
                                                code = " (" + question.examSectionQuestion.examSection.exam.course.code + ")";
                                            }
                                            if(! isInArray($scope.examNames , question.examSectionQuestion.examSection.exam.name + code)) {
                                                $scope.examNames.push(question.examSectionQuestion.examSection.exam.name + code);
                                            }
                                        }
                                        if(question.examSectionQuestion && question.examSectionQuestion.examSection && ! isInArray($scope.sectionNames, question.examSectionQuestion.examSection.name)) {
                                            $scope.sectionNames.push(question.examSectionQuestion.examSection.name);
                                        }
                                    });
                                },
                                function (error) {
                                    toastr.error(error.data);
                                });
                        }

                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                $scope.setQuestionType = function () {
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

                $scope.estimateWords = function () {
                    $scope.newQuestion.words = Math.ceil($scope.newQuestion.maxCharacters / 7.5) || 0;
                    return $scope.newQuestion.words;
                };

                var update = function () {
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
                    var deferred = $q.defer();
                    QuestionRes.questions.update({id: $scope.newQuestion.id}, questionToUpdate,
                        function () {
                            toastr.info($translate("sitnet_question_saved"));
                            deferred.resolve();
                        }, function (error) {
                            toastr.error(error.data);
                            deferred.reject();
                        }
                    );
                    return deferred.promise;
                };

                $scope.deleteQuestion = function () {
                    if (confirm($translate('sitnet_remove_question'))) {
                        QuestionRes.questions.delete({'id': $scope.newQuestion.id}, function () {
                            toastr.info($translate('sitnet_question_removed'));
                            if ($routeParams.examId === undefined) {
                                $location.path("/questions/");
                            } else {
                                $location.path("/exams/" + $routeParams.examId);
                            }
                        });
                    }
                };

                $scope.saveQuestion = function () {
                    var returnUrl, query;
                    //Set return URL pointing back to questions main page if we came from there
                    if ($routeParams.examId === undefined) {
                        returnUrl = "/questions/";
                    }
                    //Set return URL to exam, if we came from there
                    else {
                        query = {'scrollTo': 'section' + $routeParams.sectionId};
                        returnUrl = "/exams/" + $routeParams.examId;
                    }
                    update().then(function () {
                        // If creating new exam question also bind the question to section of the exam at this point
                        if (!$routeParams.examId || $routeParams.editId) {
                            if (query) {
                                $location.search(query);
                            }
                            $location.path(returnUrl);
                        }
                        else {
                            var params = {
                                eid: $routeParams.examId,
                                sid: $routeParams.sectionId,
                                qid: $scope.newQuestion.id,
                                seq: $routeParams.seqId
                            };
                            ExamRes.sectionquestions.insert(params, function () {
                                toastr.info($translate("sitnet_question_added_to_section"));
                                $location.search(query);
                                $location.path(returnUrl);
                            }, function (error) {
                                toastr.error(error.data);
                                $location.search(query);
                                $location.path(returnUrl);
                            });
                        }
                    }, function () {
                        $location.path(returnUrl);
                    });
                };

                $scope.updateEvaluationType = function () {
                    if ($scope.newQuestion.evaluationType && $scope.newQuestion.evaluationType === 'Select') {
                        $scope.newQuestion.maxScore = undefined;
                    }
                    $scope.updateQuestion();
                };

                $scope.updateQuestion = function () {
                    if (!$scope.newQuestion.maxScore) {
                        // TODO: how to put this check onto template? ui-change directive is applied in any case, even
                        // TODO: if the input is invalid or missing.
                        return;
                    }
                    update();
                };

                $scope.removeTag = function (tag) {
                    TagRes.question.remove({tid: tag.id, qid: $scope.newQuestion.id}, function () {
                        toastr.info($translate('sitnet_question_disassociated_with_tag'));
                        $scope.newQuestion.tags.splice($scope.newQuestion.tags.indexOf(tag, 1));
                    }, function (err) {
                        toastr.error(err);
                    });
                };

                // from the editor directive activated "onblur"
                $scope.updateProperties = function () {
                    $scope.updateQuestion();
                };

                $scope.addNewOption = function (newQuestion) {

                    var option_description = $translate('sitnet_default_option_description');

                    var option = {
                        "option": option_description,
                        "correctOption": false,
                        "score": 1
                    };

                    QuestionRes.options.create({qid: newQuestion.id}, option,
                        function (response) {
                            newQuestion.options.push(response);
                            toastr.info($translate('sitnet_option_added'));
                            focus('opt' + response.id);
                            //focus("opt" + response.id);
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.radioChecked = function (option) {
                    option.correctOption = true;

                    angular.forEach($scope.newQuestion.options, function (value) {
                        if (value.id !== option.id) {
                            value.correctOption = false;
                        }
                    });
                };

                $scope.removeOption = function (option) {

                    QuestionRes.options.delete({qid: null, oid: option.id},
                        function () {
                            $scope.newQuestion.options.splice($scope.newQuestion.options.indexOf(option), 1);
                            toastr.info($translate('sitnet_option_removed'));
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );

                };


                $scope.updateOption = function (option) {
                    QuestionRes.options.update({oid: option.id}, option,
                        function () {
                            toastr.info($translate('sitnet_option_updated'));
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.correctAnswerToggled = function (optionId, newQuestion) {

                    angular.forEach(newQuestion.options, function (option) {
                        // This is the option that was clicked
                        if (option.id === optionId) {
                            // If the correct is false then switch it to true, otherwise do nothing
                            if (option.correctOption === false) {
                                option.correctOption = true;

                                QuestionRes.options.update({oid: optionId}, option,
                                    function () {
                                        toastr.info($translate('sitnet_correct_option_updated'));
                                    }, function (error) {
                                        toastr.error(error.data);
                                    }
                                );
                            }
                        } else {
                            // Check for true values in other options than that was clicked and if found switch them to false
                            if (option.correctOption === true) {
                                option.correctOption = false;

                                QuestionRes.options.update({oid: optionId}, option,
                                    function (response) {
                                    }, function (error) {
                                        toastr.error(error.data);
                                    }
                                );
                            }
                        }
                    });
                };

                $scope.selectFile = function () {

                    var question = $scope.newQuestion;

                    var ctrl = function ($scope, $modalInstance) {

                        $scope.newQuestion = question;

                        $scope.submit = function (question) {

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
                                .success(function (attachment) {
                                    $modalInstance.dismiss();
                                    question.attachment = attachment;
                                })
                                .error(function (error) {
                                    $modalInstance.dismiss();
                                    toastr.error(error);
                                });
                        };
                        // Cancel button is pressed in the modal dialog
                        $scope.cancel = function () {
                            $modalInstance.dismiss('Canceled');
                        };
                    };

                    var modalInstance = $modal.open({
                        templateUrl: SITNET_CONF.TEMPLATES_PATH + 'question/editor/dialog_question_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl
                    });

                    modalInstance.result.then(function () {
                        // OK button
                        $location.path('/questions/' + $scope.newQuestion.id);
                    }, function () {
                        // Cancel button
                    });
                };

            }]);
}());
