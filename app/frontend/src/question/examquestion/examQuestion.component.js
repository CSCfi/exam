/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import angular from 'angular';
import toast from 'toastr';

angular.module('app.question').component('examQuestion', {
    template: require('./examQuestion.template.html'),
    bindings: {
        examQuestion: '<',
        lotteryOn: '<',
        onSave: '&',
        onCancel: '&',
    },
    controller: [
        '$scope',
        '$translate',
        '$state',
        'Attachment',
        'Question',
        function($scope, $translate, $state, Attachment, Question) {
            // This component depicts a distributed exam question

            const vm = this;

            vm.commaSeparatedMissingOpts = null;

            const init = function() {
                Question.questionsApi.get({ id: vm.examQuestion.question.id }, function(data) {
                    vm.question = data;
                    const sections = vm.question.examSectionQuestions.map(function(esq) {
                        return esq.examSection;
                    });
                    const examNames = sections.map(function(s) {
                        if (s.exam.state === 'PUBLISHED') {
                            vm.isInPublishedExam = true;
                        }
                        return s.exam.name;
                    });
                    const sectionNames = sections.map(function(s) {
                        return s.name;
                    });
                    // remove duplicates
                    vm.examNames = examNames.filter(function(n, pos) {
                        return examNames.indexOf(n) === pos;
                    });
                    vm.sectionNames = sectionNames.filter(function(n, pos) {
                        return sectionNames.indexOf(n) === pos;
                    });
                });
                vm.validate();
            };

            vm.$onInit = function() {
                init();
            };

            vm.showWarning = function() {
                return vm.examNames && vm.examNames.length > 1;
            };

            vm.estimateCharacters = function() {
                return (vm.examQuestion.expectedWordCount || 0) * 8;
            };

            vm.selectIfDefault = function(value, $event) {
                if (value === $translate.instant('sitnet_default_option_description')) {
                    $event.target.select();
                }
            };

            vm.removeOption = function(selectedOption) {
                if (vm.lotteryOn) {
                    toast.error($translate.instant('sitnet_action_disabled_lottery_on'));
                    return;
                }

                const hasCorrectAnswer =
                    vm.examQuestion.options.filter(function(o) {
                        return o.id !== selectedOption.id && (o.option.correctOption || o.option.defaultScore > 0);
                    }).length > 0;

                // Either not published exam or correct answer exists
                if (!vm.isInPublishedExam || hasCorrectAnswer) {
                    vm.examQuestion.options.splice(vm.examQuestion.options.indexOf(selectedOption), 1);
                } else {
                    toast.error($translate.instant('sitnet_action_disabled_minimum_options'));
                }
            };

            vm.addNewOption = function() {
                if (vm.lotteryOn) {
                    toast.error($translate.instant('sitnet_action_disabled_lottery_on'));
                    return;
                }
                vm.examQuestion.options.push({ option: { correctOption: false } });
            };

            vm.correctAnswerToggled = function(option) {
                Question.toggleCorrectOption(
                    option.option,
                    vm.examQuestion.options.map(function(o) {
                        return o.option;
                    }),
                );
            };

            vm.optionDisabled = function(option) {
                return option.option.correctOption;
            };

            vm.updateEvaluationType = function() {
                if (vm.examQuestion.evaluationType && vm.examQuestion.evaluationType === 'Selection') {
                    delete vm.examQuestion.maxScore;
                }
            };

            vm.selectFile = function() {
                Attachment.selectFile(true).then(function(data) {
                    data.attachmentFile.modified = true;
                    vm.question.attachment = data.attachmentFile;
                });
            };

            vm.downloadQuestionAttachment = function() {
                Attachment.downloadQuestionAttachment(vm.question);
            };

            vm.removeQuestionAttachment = function() {
                Attachment.removeQuestionAttachment(vm.question);
            };

            vm.getFileSize = function() {
                return !vm.question || !vm.question.attachment
                    ? 0
                    : Attachment.getFileSize(vm.question.attachment.file.size);
            };

            vm.save = function() {
                clearListeners();
                vm.onSave({ question: vm.question, examQuestion: vm.examQuestion });
            };

            vm.cancel = function() {
                clearListeners();
                vm.onCancel();
            };

            vm.calculateMaxPoints = function() {
                return Question.calculateMaxPoints(vm.examQuestion);
            };

            vm.returnOptionClass = function(option) {
                const optionType = vm.determineOptionType(option);
                if (!optionType) {
                    return;
                }
                return Question.returnClaimChoiceOptionClass(optionType);
            };

            vm.returnOptionDescriptionTranslation = function(option) {
                const optionType = vm.determineOptionType(option);
                if (!optionType) {
                    return;
                }
                return Question.returnOptionDescriptionTranslation(optionType);
            };

            const routingWatcher = $scope.$on('$stateChangeStart', function(event, toState, toParams) {
                if (window.onbeforeunload) {
                    event.preventDefault();
                    // we got changes in the model, ask confirmation
                    const dialog = dialogs.confirm(
                        $translate.instant('sitnet_confirm_exit'),
                        $translate.instant('sitnet_unsaved_question_data'),
                    );
                    dialog.result.then(function(data) {
                        if (data.toString() === 'yes') {
                            // ok to reroute
                            clearListeners();
                            $state.go(toState, toParams);
                        }
                    });
                } else {
                    clearListeners();
                }
            });

            const clearListeners = function() {
                window.onbeforeunload = null;
                // Call off the event listener so it won't ask confirmation now that we are going away
                routingWatcher();
            };

            vm.determineOptionType = function(option) {
                return Question.determineClaimOptionTypeForExamQuestionOption(option);
            };

            vm.validate = function() {
                const missingOpts = Question.getInvalidDistributedClaimOptionTypes(vm.examQuestion.options)
                    .filter(type => type !== 'SkipOption')
                    .map(type => {
                        switch (type) {
                            case 'CorrectOption':
                                return $translate.instant('sitnet_question_claim_correct');
                            case 'IncorrectOption':
                                return $translate.instant('sitnet_question_claim_incorrect');
                        }
                    });

                vm.commaSeparatedMissingOpts = missingOpts.length > 0 ? missingOpts.join(', ') : null;
            };

            vm.hasInvalidClaimChoiceOptions = function() {
                return (
                    vm.examQuestion.question.type === 'ClaimChoiceQuestion' &&
                    Question.getInvalidDistributedClaimOptionTypes(vm.examQuestion.options).length > 0
                );
            };
        },
    ],
});
