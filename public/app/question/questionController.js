(function () {
    'use strict';
    angular.module("exam.controllers")
        .factory('focus', function ($rootScope, $timeout) {
            return function (name) {
                $timeout(function () {
                    $rootScope.$broadcast('focusOn', name);
                });
            };
        })

        .controller('QuestionCtrl', ['dialogs', '$rootScope', '$scope', '$q', '$http', '$modal', '$routeParams',
            '$location', '$translate', 'focus', 'QuestionRes', 'questionService', 'ExamRes', 'TagRes', 'EXAM_CONF',
            'fileService',
            function (dialogs, $rootScope, $scope, $q, $http, $modal, $routeParams, $location, $translate, focus,
                      QuestionRes, questionService, ExamRes, TagRes, EXAM_CONF, fileService) {

                var essayQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + "question/editor/essay_question.html";
                var multiChoiceQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + "question/editor/multiple_choice_question.html";

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
                        if ($scope.newQuestion.type === 'WeightedMultipleChoiceQuestion' ||
                            ($scope.newQuestion.evaluationType && $scope.newQuestion.evaluationType === 'Select')) {
                            delete $scope.newQuestion.maxScore; // will screw up validation otherwise
                        }

                        if ($routeParams.examId) {
                            ExamRes.exams.get({id: $routeParams.examId},
                                function (exam) {

                                    if (exam.name) {
                                        var code = "";
                                        if (exam.course != undefined && exam.course.code != undefined) {
                                            code = " (" + exam.course.code + ")";
                                        }
                                        if (!isInArray($scope.examNames, exam.name + code)) {
                                            $scope.examNames.push(exam.name + code);
                                        }
                                    }
                                    if (exam.examSections && exam.examSections.length > 0) {

                                        angular.forEach(exam.examSections, function (section) {
                                            if (section.id == $routeParams.sectionId) {
                                                if (!isInArray($scope.sectionNames, section.name)) {
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
                                        if (question &&
                                            question.examSectionQuestion &&
                                            question.examSectionQuestion.examSection &&
                                            question.examSectionQuestion.examSection.exam &&
                                            question.examSectionQuestion.examSection.exam.name && !isInArray($scope.examNames, question.examSectionQuestion.examSection.exam.name)) {
                                            var code = "";
                                            if (question.examSectionQuestion.examSection.exam.course && question.examSectionQuestion.examSection.exam.course.code) {
                                                code = " (" + question.examSectionQuestion.examSection.exam.course.code + ")";
                                            }
                                            if (!isInArray($scope.examNames, question.examSectionQuestion.examSection.exam.name + code)) {
                                                $scope.examNames.push(question.examSectionQuestion.examSection.exam.name + code);
                                            }
                                        }
                                        if (question &&
                                            question.examSectionQuestion &&
                                            question.examSectionQuestion.examSection &&
                                            question.examSectionQuestion.examSection.name && !isInArray($scope.sectionNames, question.examSectionQuestion.examSection.name)) {
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
                            $scope.newOptionTemplate = EXAM_CONF.TEMPLATES_PATH + "question/editor/option.html";
                            break;
                        case 'WeightedMultipleChoiceQuestion':
                            $scope.questionTemplate = multiChoiceQuestionTemplate;
                            $scope.newOptionTemplate = EXAM_CONF.TEMPLATES_PATH + "question/editor/weighted_option.html";
                            break;
                    }
                };

                $scope.estimateWords = function () {
                    $scope.newQuestion.words = Math.ceil($scope.newQuestion.maxCharacters / 7.5) || 0;
                    return $scope.newQuestion.words;
                };

                $scope.calculateMaxPoints = function (question) {
                    return questionService.calculateMaxPoints(question);
                };

                var update = function (displayErrors) {
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
                        case 'WeightedMultipleChoiceQuestion':
                            questionToUpdate.options = $scope.newQuestion.options;
                            break;
                    }
                    var deferred = $q.defer();
                    QuestionRes.questions.update({id: $scope.newQuestion.id}, questionToUpdate,
                        function () {
                            toastr.info($translate.instant("sitnet_question_saved"));
                            deferred.resolve();
                        }, function (error) {
                            if (displayErrors) {
                                toastr.error(error.data);
                            }
                            deferred.reject();
                        }
                    );
                    return deferred.promise;
                };

                $scope.deleteQuestion = function () {
                    var confirmation = $scope.newQuestion.state === 'NEW' ?
                        'sitnet_confirm_question_removal' :
                        'sitnet_remove_question_from_library_only';
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant(confirmation));
                    dialog.result.then(function (btn) {
                        QuestionRes.questions.delete({'id': $scope.newQuestion.id}, function () {
                            toastr.info($translate.instant('sitnet_question_removed'));
                            if ($routeParams.examId === undefined) {
                                $location.path("/questions/");
                            } else {
                                $location.path("/exams/" + $routeParams.examId);
                            }
                        });
                    });
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
                    update(true).then(function () {
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
                                toastr.info($translate.instant("sitnet_question_added_to_section"));
                                $location.search(query);
                                $location.path(returnUrl);
                            }, function (error) {
                                toastr.error(error.data);
                                //$location.search(query);
                                //$location.path(returnUrl);
                            });
                        }
                    }, function () {
                        toastr.error(error.data);
                        //$location.path(returnUrl);
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
                        toastr.info($translate.instant('sitnet_question_disassociated_with_tag'));
                        $scope.newQuestion.tags.splice($scope.newQuestion.tags.indexOf(tag), 1);
                    }, function (err) {
                        toastr.error(err);
                    });
                };

                // from the editor directive activated "onblur"
                $scope.updateProperties = function () {
                    $scope.updateQuestion();
                };

                $scope.addNewOption = function (newQuestion) {

                    QuestionRes.options.create({qid: newQuestion.id},
                        function (response) {
                            newQuestion.options.push(response);
                            toastr.info($translate.instant('sitnet_option_added'));
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
                            toastr.info($translate.instant('sitnet_option_removed'));
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );

                };

                $scope.selectIfDefault = function (value, $event) {
                    if (value === $translate.instant('sitnet_default_option_description')) {
                        $event.target.select();
                    }
                };

                $scope.updateOption = function (option) {
                    QuestionRes.options.update({oid: option.id}, option,
                        function () {
                            toastr.info($translate.instant('sitnet_option_updated'));
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.correctAnswerToggled = function (option) {
                    QuestionRes.correctOption.update({oid: option.id}, option,
                        function (question) {
                            $scope.newQuestion.options = question.options;
                            toastr.info($translate.instant('sitnet_correct_option_updated'));
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.selectFile = function () {

                    var question = $scope.newQuestion;

                    var ctrl = ["$scope", "$modalInstance", function ($scope, $modalInstance) {

                        $scope.newQuestion = question;
                        $scope.isTeacherModal = true;
                        fileService.getMaxFilesize().then(function (data) {
                            $scope.maxFileSize = data.filesize;
                        });

                        $scope.submit = function () {
                            fileService.upload("attachment/question", $scope.attachmentFile, {questionId: $scope.newQuestion.id}, $scope.newQuestion, $modalInstance);
                        };
                        // Cancel button is pressed in the modal dialog
                        $scope.cancel = function () {
                            $modalInstance.dismiss('Canceled');
                        };

                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'common/dialog_attachment_selection.html',
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
