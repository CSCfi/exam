'use strict';
angular.module('app.question')
    .component('examQuestion', {
        templateUrl: '/assets/app/question/examquestion/examQuestion.template.html',
        bindings: {
            examQuestion: '<',
            lotteryOn: '<',
            onSave: '&',
            onCancel: '&'
        },
        controller: ['$scope', '$translate', 'Attachment', 'Question', 'toast',
            function ($scope, $translate, Attachment, Question, toast) {
                // This component depicts a distributed exam question

                var vm = this;

                var init = function () {
                    Question.questionsApi.get({id: vm.examQuestion.question.id}, function (data) {
                        vm.question = data;
                        var sections = vm.question.examSectionQuestions.map(function (esq) {
                            return esq.examSection;
                        });
                        var examNames = sections.map(function (s) {
                            if (s.exam.state === 'PUBLISHED') {
                                vm.isInPublishedExam = true;
                            }
                            return s.exam.name;
                        });
                        var sectionNames = sections.map(function (s) {
                            return s.name;
                        });
                        // remove duplicates
                        vm.examNames = examNames.filter(function (n, pos) {
                            return examNames.indexOf(n) === pos;
                        });
                        vm.sectionNames = sectionNames.filter(function (n, pos) {
                            return sectionNames.indexOf(n) === pos;
                        });
                    });
                };

                vm.$onInit = function () {
                    init();
                };

                vm.showWarning = function () {
                    return vm.examNames && vm.examNames.length > 1;
                };

                vm.estimateCharacters = function () {
                    return (vm.examQuestion.expectedWordCount || 0) * 8;
                };

                vm.selectIfDefault = function (value, $event) {
                    if (value === $translate.instant('sitnet_default_option_description')) {
                        $event.target.select();
                    }
                };

                vm.removeOption = function (selectedOption) {

                    if (vm.lotteryOn) {
                        toast.error($translate.instant('sitnet_action_disabled_lottery_on'));
                        return;
                    }

                    var hasCorrectAnswer = vm.examQuestion.options.filter(function (o) {
                        return o.id !== selectedOption.id && (o.option.correctOption || o.option.defaultScore > 0);
                    }).length > 0;

                    // Either not published exam or correct answer exists
                    if (!vm.isInPublishedExam || hasCorrectAnswer) {
                        vm.examQuestion.options.splice(vm.examQuestion.options.indexOf(selectedOption), 1);
                    } else {
                        toast.error($translate.instant('sitnet_action_disabled_minimum_options'));
                    }
                };

                vm.addNewOption = function () {
                    if (vm.lotteryOn) {
                        toast.error($translate.instant('sitnet_action_disabled_lottery_on'));
                        return;
                    }
                    vm.examQuestion.options.push({option: {correctOption: false}});
                };

                vm.correctAnswerToggled = function (option) {
                    Question.toggleCorrectOption(option.option,
                        vm.examQuestion.options.map(function (o) {
                                return o.option;
                            }
                        ));
                };

                vm.optionDisabled = function (option) {
                    return option.option.correctOption;
                };

                vm.updateEvaluationType = function () {
                    if (vm.examQuestion.evaluationType && vm.examQuestion.evaluationType === 'Selection') {
                        delete vm.examQuestion.maxScore;
                    }
                };

                vm.selectFile = function () {
                    Attachment.selectFile(true).then(function (data) {
                        data.attachmentFile.modified = true;
                        vm.question.attachment = data.attachmentFile;
                    });
                };

                vm.downloadQuestionAttachment = function () {
                    Attachment.downloadQuestionAttachment(vm.question);
                };

                vm.removeQuestionAttachment = function () {
                    Attachment.removeQuestionAttachment(vm.question);
                };

                vm.getFileSize = function () {
                    return !vm.question ? 0 : Attachment.getFileSize(vm.question.attachment);
                };

                vm.save = function () {
                    clearListeners();
                    vm.onSave({question: vm.question, examQuestion: vm.examQuestion});
                };

                vm.cancel = function () {
                    clearListeners();
                    vm.onCancel();
                };

                vm.calculateMaxPoints = function () {
                    return Question.calculateMaxPoints(vm.examQuestion);
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

                var clearListeners = function () {
                    window.onbeforeunload = null;
                    // Call off the event listener so it won't ask confirmation now that we are going away
                    routingWatcher();
                };


            }]
    });

