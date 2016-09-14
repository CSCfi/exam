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
                    return (question.defaultExpectedWordCount || 0) * 8;
                };

                $scope.calculateMaxPoints = function (question) {
                    return questionService.calculateMaxPoints(question);
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

                var create = function () {
                    return questionService.createQuestion($scope.newQuestion);
                };

                var update = function (displayErrors) {
                    return questionService.updateQuestion($scope.newQuestion, displayErrors);
                };

                $scope.cancel = function () {
                    toastr.info($translate.instant('sitnet_canceled'));
                    $location.path('/questions');
                };

                $scope.saveQuestion = function () {
                    var successFn = function () {
                        $location.path('/questions');
                        questionService.clearQuestions();
                    };
                    var errFn = function (error) {
                        toastr.error(error.data);
                    };
                    if ($scope.newQuestion.id) {
                        update(true).then(successFn, errFn);
                    } else {
                        create().then(successFn, errFn);
                    }
                };

                $scope.updateEvaluationType = function () {
                    if ($scope.newQuestion.defaultEvaluationType === 'Selection') {
                        delete $scope.newQuestion.defaultMaxScore;
                    }
                };

                $scope.removeTag = function (tag) {
                    $scope.newQuestion.tags.splice($scope.newQuestion.tags.indexOf(tag), 1);
                };

                $scope.addNewOption = function (newQuestion) {
                    if ($scope.lotteryOn) {
                        toastr.error($translate.instant("sitnet_action_disabled_lottery_on"));
                        return;
                    }
                    newQuestion.options.push({correctOption: false});
                };

                function removeOption(option) {
                    $scope.newQuestion.options.splice($scope.newQuestion.options.indexOf(option), 1);
                }

                $scope.removeOption = function (option) {
                    if ($scope.lotteryOn) {
                        toastr.error($translate.instant("sitnet_action_disabled_lottery_on"));
                    } else {
                        removeOption(option);
                    }
                };

                $scope.selectIfDefault = function (value, $event) {
                    if (value === $translate.instant('sitnet_default_option_description')) {
                        $event.target.select();
                    }
                };

                $scope.correctAnswerToggled = function (option) {
                    questionService.toggleCorrectOption(option, $scope.newQuestion.options);
                };

                $scope.optionDisabled = function (option) {
                    return option.correctOption == true;
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
                    var i = $scope.newQuestion.questionOwners.indexOf(user);
                    if (i > 0) {
                        $scope.newQuestion.questionOwners.splice(i, 1);
                    }
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
                            if (!fileService.isFileTooBig($scope.attachmentFile)) {
                                $modalInstance.close($scope.attachmentFile);
                            }
                        };

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

                    modalInstance.result.then(function (attachment) {
                        attachment.modified = true;
                        $scope.newQuestion.attachment = attachment;
                    });
                };

                // Action
                var type = $routeParams.type || $scope.questionType;
                if (type) {
                    // Create new question
                    $scope.newQuestion = questionService.getQuestionDraft(type);
                    initQuestion();
                } else {
                    // Edit saved question
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
