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

        .controller('QuestionCtrl', ['dialogs', '$rootScope', '$timeout', '$scope', '$q', '$http', '$uibModal', '$routeParams',
            '$location', '$translate', 'focus', 'QuestionRes', 'questionService', 'ExamRes', 'TagRes', 'EXAM_CONF',
            'fileService', 'sessionService', 'UserRes', 'limitToFilter',
            function (dialogs, $rootScope, $timeout, $scope, $q, $http, $modal, $routeParams, $location, $translate, focus,
                      QuestionRes, questionService, ExamRes, TagRes, EXAM_CONF, fileService, sessionService, UserRes, limitToFilter) {

                var essayQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + "question/editor/essay_question.html";
                var multiChoiceQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + "question/editor/multiple_choice_question.html";

                $scope.questionTemplate = null;
                $scope.bodyTemplate = EXAM_CONF.TEMPLATES_PATH + "question/editor/question_body.html";
                $scope.returnURL = null;

                $scope.examNames = [];
                $scope.sectionNames = [];

                $scope.user = sessionService.getUser();

                $scope.newQuestionText={};
                $scope.newQuestion = {};
                $scope.createQuestionModel = {};
                $scope.questionTypes = [
                {"type":"essay","name":"sitnet_toolbar_essay_question"},
                {"type":"cloze","name":"sitnet_toolbar_cloze_test_question"},
                {"type":"multichoice","name":"sitnet_toolbar_multiplechoice_question"},
                {"type":"weighted","name":"sitnet_toolbar_weighted_multiplechoice_question"}];

                var setQuestionType = function () {
                    switch ($scope.newQuestion.type) {
                        case 'EssayQuestion':
                            $scope.questionTemplate = essayQuestionTemplate;
                            $scope.newQuestion.defaultEvaluationType = $scope.newQuestion.defaultEvaluationType || "Points";
                            break;
                        case 'ClozeTestQuestion':
                            // No template needed
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

                var routingWatcher = $scope.$on('$locationChangeStart', function (event, newUrl) {
                    if (window.onbeforeunload) {
                        event.preventDefault();
                        // we got changes in the model, ask confirmation
                        var dialog = dialogs.confirm($translate.instant('sitnet_confirm_exit'),
                            $translate.instant('sitnet_unsaved_question_data'));
                        dialog.result.then(function (data) {
                            if (data.toString() === 'yes') {
                                // ok to reroute
                                clearListeners();
                                $location.path(newUrl.substring($location.absUrl().length - $location.url().length));
                            }
                        });
                    } else {
                        clearListeners();
                    }
                });

                var watchForChanges = function() {
                    $timeout(
                        function() {
                            $scope.$watchCollection("newQuestion", function (newVal, oldVal) {
                                if (angular.equals(newVal, oldVal)) {
                                    return;
                                }
                                if (!window.onbeforeunload) {
                                    window.onbeforeunload = function () {
                                        return $translate.instant('sitnet_unsaved_data_may_be_lost');
                                    };
                                }
                            })}, 2000);
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
                    watchForChanges();
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

                $scope.calculateDefaultMaxPoints = function (question) {
                    return questionService.calculateDefaultMaxPoints(question);
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

                var create = function () {
                    return questionService.createQuestion($scope.newQuestion);
                };

                var update = function (displayErrors) {
                    return questionService.updateQuestion($scope.newQuestion, displayErrors);
                };

                $scope.cancel = function () {
                    toastr.info($translate.instant('sitnet_canceled'));
                    // Call off the event listener so it won't ask confirmation now that we are going away
                    clearListeners();
                    if(angular.isDefined($scope.libCtrl)) {
                        $scope.addEditQuestion.showForm = false;
                        $scope.addEditQuestion.id = null;
                    }
                    else {
                        $location.path('/questions');
                    }

                };

                var clearListeners = function () {
                    window.onbeforeunload = null;
                    // Call off the event listener so it won't ask confirmation now that we are going away
                    routingWatcher();
                };

                $scope.saveQuestion = function (isDialog) {

                    var successFn = function () {
                        clearListeners();

                        if(angular.isDefined($scope.libCtrl)) {
                            $scope.addEditQuestion.showForm = false;
                            $scope.addEditQuestion.id = null;
                            $rootScope.$emit('questionAdded');
                        }
                        else {
                            $location.path('/questions');
                        }
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

                $scope.isUserAllowedToModifyOwners = function (question) {
                    return question && question.questionOwners && ($scope.user.isAdmin ||
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
                            $modalInstance.dismiss();
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


                $scope.newOwner = {id: null, name: null};

                $scope.questionOwners = function (filter, criteria) {
                    var data = {
                        role: 'TEACHER',
                        q: criteria
                    };
                    //if ($scope.question.id) {
                    //    data.qid = $scope.question.id;
                    //}
                    return UserRes.filterOwnersByQuestion.query(data).$promise.then(
                        function (names) {
                            return limitToFilter(
                                names.filter(function (n) {
                                    return $scope.newQuestion.questionOwners.map(function (qo) {
                                            return qo.id;
                                        }).indexOf(n.id) == -1;
                                }), 15);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.setQuestionOwner = function ($item, $model, $label) {
                    $scope.newOwner.id = $item.id;
                    $scope.newOwner.firstName = $item.firstName;
                    $scope.newOwner.lastName = $item.lastName;
                };

                $scope.addQuestionOwner = function () {
                    if ($scope.newOwner.id) {
                        $scope.newQuestion.questionOwners.push($scope.newOwner);
                    }
                };

                $scope.createQuestion = function () {
                    if($scope.createQuestionModel.QuestionToBe.type != "") {
                        $scope.typeSelected=true;
                        $scope.newQuestion = questionService.getQuestionDraft($scope.createQuestionModel.QuestionToBe.type);
                        initQuestion();

                        // jos käyttäjä on laittanut kysymystekstiin jotain ennen tyypin valintaa, kopioidaan tuo
                        // teksti dummy-textareasta varsinaiseen newQuestion.question objektiin.
                        if($scope.newQuestionText.text) {
                            $scope.newQuestion.question = $scope.newQuestionText.text;
                        }
                    }
                }

                // Action
                if($routeParams.create == 1) {
                    // create new question from library list or dashboard
                    $scope.typeSelected=false;
                }
                else if($scope.baseQuestionId && $scope.fromDialog) {

                    // Another one, when coming straight from questions tab in exam
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
                else if(($scope.baseQuestionId || $routeParams.id) && $routeParams.tab != 1 ) {
                    // Edit saved question from library list or dashboard
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
                else if(!$scope.addEditQuestion.id) {
                    // create new question from library modal
                    $scope.typeSelected=false;

                }
                else if($scope.addEditQuestion.id) {
                   // Edit saved question from library modal
                    $scope.addEditQuestion.showForm=true;

                    QuestionRes.questions.get({id: $scope.addEditQuestion.id},
                        function (question) {
                            // kind of a hack to have the editor displayed
                            // can't be rendered if content == null
                            if (question.question == null) {
                                question.question = '';
                            }
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
