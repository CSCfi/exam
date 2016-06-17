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

        .controller('QuestionCtrl', ['dialogs', '$rootScope', '$scope', '$q', '$http', '$uibModal', '$routeParams',
            '$location', '$translate', 'focus', 'QuestionRes', 'questionService', 'ExamRes', 'TagRes', 'EXAM_CONF',
            'fileService', 'sessionService',
            function (dialogs, $rootScope, $scope, $q, $http, $modal, $routeParams, $location, $translate, focus,
                      QuestionRes, questionService, ExamRes, TagRes, EXAM_CONF, fileService, sessionService) {

                var essayQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + "question/editor/essay_question.html";
                var multiChoiceQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + "question/editor/multiple_choice_question.html";

                $scope.questionTemplate = null;
                $scope.bodyTemplate = EXAM_CONF.TEMPLATES_PATH + "question/editor/question_body.html";
                $scope.returnURL = null;

                $scope.examNames = [];
                $scope.sectionNames = [];

                $scope.user = sessionService.getUser();

                var setQuestionType = function () {
                    switch ($scope.newQuestion.type) {
                        case 'EssayQuestion':
                            $scope.questionTemplate = essayQuestionTemplate;
                            $scope.newQuestion.defaultEvaluationType = $scope.newQuestion.defaultEvaluationType || "Points";
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

                var initQuestion = function () {
                    setQuestionType();
                    if ($scope.newQuestion.type === 'WeightedMultipleChoiceQuestion' ||
                        ($scope.newQuestion.defaultEvaluationType && $scope.newQuestion.defaultEvaluationType === 'Selection')) {
                        delete $scope.newQuestion.defaultMaxScore; // will screw up validation otherwise
                    }
                    var sections = $scope.newQuestion.examSectionQuestions.map(function (esq) {
                        return esq.examSection;
                    });
                    var examNames = sections.map(function (s) {
                        return s.exam.name;
                    });
                    var sectionNames = sections.map(function (s) {
                        return s.name;
                    });
                    // remove duplicates
                    $scope.examNames = examNames.filter(function (n, pos) {
                        return examNames.indexOf(n) == pos;
                    });
                    $scope.sectionNames = sectionNames.filter(function (n, pos) {
                        return sectionNames.indexOf(n) == pos;
                    });
                };

                $scope.showWarning = function () {
                    return $scope.examNames.length > 1;
                };

                $scope.estimateCharacters = function (question) {
                    return !question ? NaN : question.defaultExpectedWordCount * 8;
                };

                $scope.calculateMaxPoints = function (question) {
                    return questionService.calculateMaxPoints(question);
                };

                var update = function (displayErrors) {
                    return questionService.updateQuestion($scope.newQuestion, displayErrors);
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
                                // Clear cache to trigger a refresh now that there is a new entry
                                questionService.clearQuestions();
                            } else {
                                $location.path("/exams/" + $routeParams.examId);
                            }
                        });
                    });
                };

                $scope.saveQuestion = function () {
                    update(true).then(function () {
                        $location.path('/questions');
                        questionService.clearQuestions();
                    }, function () {
                        toastr.error(error.data);
                    });
                };

                $scope.updateEvaluationType = function () {
                    if ($scope.newQuestion.defaultEvaluationType && $scope.newQuestion.defaultEvaluationType === 'Selection') {
                        $scope.newQuestion.defaultMaxScore = undefined;
                    }
                    $scope.updateQuestion();
                };

                $scope.updateQuestion = function () {
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
                    if ($scope.lotteryOn) {
                        toastr.error($translate.instant("sitnet_action_disabled_lottery_on"));
                        return;
                    }
                    newQuestion.options.push({});
                };

                function radioChecked(option) {
                    option.correctOption = true;

                    angular.forEach($scope.newQuestion.options, function (value) {
                        if (value.id !== option.id) {
                            value.correctOption = false;
                        }
                    });
                }

                function removeOption(option) {
                    $scope.newQuestion.options.splice($scope.newQuestion.options.indexOf(option), 1);
                    toastr.info($translate.instant('sitnet_option_removed'));
                }

                $scope.removeOption = function (option) {
                    if ($scope.lotteryOn) {
                        toastr.error($translate.instant("sitnet_action_disabled_lottery_on"));
                        return;
                    }
                    if (angular.isUndefined(option.id)) {
                        removeOption(option);
                        return;
                    }
                    QuestionRes.options.delete({qid: null, oid: option.id},
                        function () {
                            removeOption(option);
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

                $scope.saveOption = function (option) {
                    var type = $scope.newQuestion.type;
                    if (type === "WeightedMultipleChoiceQuestion" && angular.isUndefined(option.defaultScore)) {
                        return;
                    }

                    if (angular.isUndefined(option.option)) {
                        return;
                    }

                    var data = {
                        defaultScore: option.defaultScore,
                        correctOption: option.correctOption,
                        option: option.option
                    };
                    if (angular.isUndefined(option.id)) {
                        QuestionRes.options.create({qid: $scope.newQuestion.id}, data,
                            function (response) {
                                option.id = response.id;
                                toastr.info($translate.instant('sitnet_option_added'));
                            }, function (error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                };

                $scope.updateOption = function (option) {
                    var type = $scope.newQuestion.type;
                    if (type === "WeightedMultipleChoiceQuestion" && angular.isUndefined(option.defaultScore)) {
                        return;
                    }
                    if (angular.isUndefined(option.option)) {
                        return;
                    }
                    QuestionRes.options.update({oid: option.id}, option,
                        function () {
                            toastr.info($translate.instant('sitnet_option_updated'));
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.correctAnswerToggled = function (option) {
                    if (angular.isUndefined(option.id)) {
                        return;
                    }
                    QuestionRes.correctOption.update({oid: option.id}, option,
                        function (question) {
                            radioChecked(option);
                            toastr.info($translate.instant('sitnet_correct_option_updated'));
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.optionDisabled = function (option) {
                    return angular.isUndefined(option.id) || option.correctOption;
                };

                $scope.openQuestionOwnerModal = function () {
                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'question/editor/question_owner.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "QuestionOwnerController",
                        resolve: {
                            question: function () {
                                return $scope.newQuestion;
                            }
                        }
                    });

                    modalInstance.result.then(function (result) {
                        $scope.newQuestion.questionOwners.push(result);
                    }, function () {
                        // Cancel button clicked
                    });
                };

                $scope.isUserAllowedToModifyOwners = function (question) {
                    return question && ($scope.user.isAdmin ||
                            question.questionOwners.map(function (o) {
                                return o.id;
                            }).indexOf($scope.user.id) > -1
                        );
                };

                $scope.removeOwner = function (user) {
                    if ($scope.newQuestion.questionOwners.length == 1) {
                        // disallow clearing the owners
                        return;
                    }
                    QuestionRes.questionOwner.remove({questionId: $scope.newQuestion.id, uid: user.id},
                        function () {
                            var i = $scope.newQuestion.questionOwners.indexOf(user);
                            if (i > 0) {
                                $scope.newQuestion.questionOwners.splice(i, 1);
                            }
                        },
                        function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.selectFile = function () {

                    var question = $scope.newQuestion;

                    var ctrl = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {

                        $scope.newQuestion = question;
                        $scope.isTeacherModal = true;
                        fileService.getMaxFilesize().then(function (data) {
                            $scope.maxFileSize = data.filesize;
                        });

                        $scope.submit = function () {
                            fileService.upload("/app/attachment/question", $scope.attachmentFile, {questionId: $scope.newQuestion.id}, $scope.newQuestion, $modalInstance);
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

                // Action
                if ($scope.newQuestion) {
                    initQuestion();
                } else {
                    var id = $scope.baseQuestionId || $routeParams.id;
                    QuestionRes.questions.get({id: id},
                        function (question) {
                            $scope.newQuestion = question;
                            initQuestion();
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                }

            }]);
}());
