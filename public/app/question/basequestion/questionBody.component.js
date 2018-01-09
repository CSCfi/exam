/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

'use strict';
angular.module('app.question')
    .component('questionBody', {
        templateUrl: '/assets/app/question/basequestion/questionBody.template.html',
        bindings: {
            question: '<',
            currentOwners: '<',
            lotteryOn: '<'
        },
        controller: ['$scope', '$translate', 'Session', 'Attachment', 'UserRes', 'limitToFilter', 'Question', 'EXAM_CONF', 'toast',
            function ($scope, $translate, Session, Attachment, UserRes, limitToFilter, Question, EXAM_CONF, toast) {

                var essayQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + 'question/basequestion/templates/essay_question.html';
                var multiChoiceQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + 'question/basequestion/templates/multiple_choice_question.html';


                var vm = this;

                var init = function () {
                    // TODO: move these to subcomponents
                    if (vm.question.type === 'WeightedMultipleChoiceQuestion' || vm.question.defaultEvaluationType === 'Selection') {
                        delete vm.question.defaultMaxScore; // will screw up validation otherwise
                    }
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

                    vm.newOwner = {id: null, name: null};
                    vm.newType = {};
                    setQuestionTemplates();
                };

                vm.$onInit = function () {
                    vm.questionTypes = [
                        {'type': 'essay', 'name': 'sitnet_toolbar_essay_question'},
                        {'type': 'cloze', 'name': 'sitnet_toolbar_cloze_test_question'},
                        {'type': 'multichoice', 'name': 'sitnet_toolbar_multiplechoice_question'},
                        {'type': 'weighted', 'name': 'sitnet_toolbar_weighted_multiplechoice_question'}];

                    init();
                };

                function setQuestionTemplates() {
                    switch (vm.question.type) {
                        case 'EssayQuestion':
                            vm.questionTemplate = essayQuestionTemplate;
                            vm.question.defaultEvaluationType = vm.question.defaultEvaluationType || 'Points';
                            break;
                        case 'ClozeTestQuestion':
                            // No template needed
                            break;
                        case 'MultipleChoiceQuestion':
                            vm.questionTemplate = multiChoiceQuestionTemplate;
                            vm.newOptionTemplate = EXAM_CONF.TEMPLATES_PATH + 'question/basequestion/templates/option.html';
                            break;
                        case 'WeightedMultipleChoiceQuestion':
                            vm.questionTemplate = multiChoiceQuestionTemplate;
                            vm.newOptionTemplate = EXAM_CONF.TEMPLATES_PATH + 'question/basequestion/templates/weighted_option.html';
                            break;
                    }
                }

                vm.setQuestionType = function () {
                    vm.question.type = Question.getQuestionType(vm.newType.type);
                    init();
                };

                vm.showWarning = function () {
                    return vm.examNames.length > 1;
                };

                vm.questionOwners = function (filter, criteria) {
                    var data = {
                        role: 'TEACHER',
                        q: criteria
                    };
                    return UserRes.filterOwnersByQuestion.query(data).$promise.then(
                        function (names) {
                            return limitToFilter(
                                names.filter(function (n) {
                                    return vm.currentOwners.map(function (qo) {
                                        return qo.id;
                                    }).indexOf(n.id) === -1;
                                }), 15);
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.setQuestionOwner = function ($item, $model, $label) {

                    // Using template to store the selected user
                    vm.newOwnerTemplate = $item;
                };

                vm.addQuestionOwner = function () {
                    if (vm.newOwnerTemplate && vm.newOwnerTemplate.id) {
                        vm.currentOwners.push(vm.newOwnerTemplate);

                        // nullify input field and template
                        vm.newOwner.name = null;
                        vm.newOwnerTemplate = null;
                    }
                };

                vm.removeOwnerDisabled = function (user) {
                    if (vm.currentOwners.length === 1) {
                        // disallow clearing the owners
                        return true;
                    }
                    return vm.question.state === 'NEW' && Session.getUser().id === user.id;
                };

                vm.removeOwner = function (user) {
                    if (vm.removeOwnerDisabled(user)) {
                        return;
                    }
                    var i = vm.currentOwners.indexOf(user);
                    if (i >= 0) {
                        vm.currentOwners.splice(i, 1);
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
                    return Attachment.getFileSize(vm.question.attachment);
                };

                vm.updateEvaluationType = function () {
                    if (vm.question.defaultEvaluationType === 'Selection') {
                        delete vm.question.defaultMaxScore;
                    }
                };

                vm.removeTag = function (tag) {
                    vm.question.tags.splice(vm.question.tags.indexOf(tag), 1);
                };

                vm.isUserAllowedToModifyOwners = function () {
                    var user = Session.getUser();
                    return vm.question.questionOwners && (user.isAdmin ||
                        vm.question.questionOwners.map(function (o) {
                            return o.id;
                        }).indexOf(user.id) > -1
                    );
                };

                vm.estimateCharacters = function () {
                    return (vm.question.defaultExpectedWordCount || 0) * 8;
                };

                vm.calculateDefaultMaxPoints = function () {
                    return Question.calculateDefaultMaxPoints(vm.question);
                };

                vm.addNewOption = function () {
                    if (vm.lotteryOn) {
                        toast.error($translate.instant('sitnet_action_disabled_lottery_on'));
                        return;
                    }
                    vm.question.options.push({correctOption: false});
                };

                vm.selectIfDefault = function (value, $event) {
                    if (value === $translate.instant('sitnet_default_option_description')) {
                        $event.target.select();
                    }
                };

                vm.removeOption = function (option) {
                    if (vm.lotteryOn) {
                        toast.error($translate.instant('sitnet_action_disabled_lottery_on'));
                    } else {
                        removeOption(option);
                    }
                };

                vm.correctAnswerToggled = function (option) {
                    Question.toggleCorrectOption(option, vm.question.options);
                };

                vm.optionDisabled = function (option) {
                    return option.correctOption === true;
                };

                var removeOption = function (selectedOption) {
                    var hasCorrectAnswer = vm.question.options.filter(function (o) {
                        return o.id !== selectedOption.id && (o.correctOption || o.defaultScore > 0);
                    }).length > 0;

                    // Either not published exam or correct answer exists
                    if (!vm.isInPublishedExam || hasCorrectAnswer) {
                        vm.question.options.splice(vm.question.options.indexOf(selectedOption), 1);
                    } else {
                        toast.error($translate.instant('sitnet_action_disabled_minimum_options'));
                    }
                };


            }]
    });

