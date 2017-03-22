(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamSectionQuestionCtrl', ['$rootScope', '$scope', '$q', '$uibModal', '$translate', '$location',
            '$timeout', 'QuestionRes', 'ExamSectionQuestionRes', 'questionService', 'EXAM_CONF', '$sce', 'fileService', 'dialogs',
            function ($rootScope, $scope, $q, $modal, $translate, $location, $timeout, QuestionRes, ExamSectionQuestionRes,
                      questionService, EXAM_CONF, $sce, fileService, dialogs) {

                $scope.examNames = [];
                $scope.isInPublishedExam = false;
                $scope.questionCorrectOption = '';

                $scope.showWarning = function () {
                    return $scope.examNames.length > 1;
                };

                $scope.getOptions = function () {
                    return $scope.sectionQuestion.options;
                };

                $scope.trustAsHtml = function (content) {
                    return $sce.trustAsHtml(content);
                };

                $scope.estimateCharacters = function () {
                    return $scope.sectionQuestion.expectedWordCount * 8;
                };

                $scope.calculateMaxPoints = function (question) {
                    return questionService.calculateMaxPoints(question);
                };

                $scope.updateEvaluationType = function () {
                    if ($scope.sectionQuestion.evaluationType && $scope.sectionQuestion.evaluationType === 'Selection') {
                        delete $scope.sectionQuestion.maxScore;
                    }
                };

                $scope.addNewOption = function (question) {
                    if ($scope.lotteryOn) {
                        toastr.error($translate.instant("sitnet_action_disabled_lottery_on"));
                        return;
                    }
                    var option = {};
                    question.options.push(option);
                    $scope.sectionQuestion.options.push({option: option});
                };

                $scope.removeOption = function (selectedOption) {

                    if ($scope.lotteryOn) {
                        toastr.error($translate.instant("sitnet_action_disabled_lottery_on"));
                        return;
                    }

                    var hasCorrectAnswer = $scope.sectionQuestion.options.filter(function (o) {
                            return o.id != selectedOption.id && (o.option.correctOption || o.option.defaultScore > 0);
                        }).length > 0;

                    // Either not published exam or correct answer exists
                    if (!$scope.isInPublishedExam || hasCorrectAnswer) {
                        $scope.sectionQuestion.options.splice($scope.sectionQuestion.options.indexOf(selectedOption), 1);
                    } else {
                        toastr.error($translate.instant("sitnet_action_disabled_minimum_options"));
                    }

                };

                $scope.calculateDefaultMaxPoints = function (question) {
                    return questionService.calculateDefaultMaxPoints(question);
                };

                $scope.correctAnswerToggled = function (option) {
                    questionService.toggleCorrectOption(option.option,
                        $scope.sectionQuestion.options.map(function (o) {
                                return o.option;
                            }
                        ));
                };

                $scope.optionDisabled = function (option) {
                    return angular.isUndefined(option.option.id) || option.option.correctOption;
                };

                $scope.selectIfDefault = function (value, $event) {
                    if (value === $translate.instant('sitnet_default_option_description')) {
                        $event.target.select();
                    }
                };

                $scope.selectFile = function () {

                    var question = $scope.question;

                    var ctrl = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {

                        $scope.question = question;
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
                        $scope.question.attachment = attachment;
                    });
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
                                $scope.clearListeners();
                                $location.path(newUrl.substring($location.absUrl().length - $location.url().length));
                            }
                        });
                    } else {
                        $scope.clearListeners();
                    }
                });

                $scope.clearListeners = function () {
                    window.onbeforeunload = null;
                    // Call off the event listener so it won't ask confirmation now that we are going away
                    watches.forEach(function (w) {
                        w();
                    });
                    routingWatcher();
                };

                var onChange = function (newVal, oldVal) {
                    if (angular.equals(newVal, oldVal)) {
                        return;
                    }
                    if (!window.onbeforeunload) {
                        window.onbeforeunload = function () {
                            return $translate.instant('sitnet_unsaved_data_may_be_lost');
                        };
                    }
                };

                var watches = [];
                var watchForChanges = function () {
                    $timeout(function () {
                        watches.push($scope.$watchCollection("question", onChange));
                        watches.push($scope.$watch("sectionQuestion", onChange, true));
                    }, 2000);
                };

                var initForm = function () {
                    QuestionRes.questions.get({id: $scope.sectionQuestion.question.id}, function (data) {
                        $scope.question = data;
                        var examNames = $scope.question.examSectionQuestions.map(function (esq) {
                            if (esq.examSection.exam.state == 'PUBLISHED') {
                                $scope.isInPublishedExam = true;
                            }
                            return esq.examSection.exam.name;
                        });
                        // remove duplicates
                        $scope.examNames = examNames.filter(function (n, pos) {
                            return examNames.indexOf(n) == pos;
                        });
                        watchForChanges();
                    });
                };

                initForm();

            }]);
}());
