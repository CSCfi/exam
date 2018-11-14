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

angular.module('app.question')
    .component('questionBody', {
        template: require('./questionBody.template.html'),
        bindings: {
            question: '<',
            currentOwners: '<',
            lotteryOn: '<',
            examId: '<',
            sectionQuestion: '<',
        },
        controller: ['$scope', '$translate', 'Session', 'Attachment', 'UserRes', 'limitToFilter', 'Question',
            function ($scope, $translate, Session, Attachment, UserRes, limitToFilter, Question) {


                const vm = this;

                const init = function () {
                    const sections = vm.question.examSectionQuestions.map(function (esq) {
                        return esq.examSection;
                    });
                    const examNames = sections.map(function (s) {
                        if (s.exam.state === 'PUBLISHED') {
                            vm.isInPublishedExam = true;
                        }
                        return s.exam.name;
                    });
                    const sectionNames = sections.map(function (s) {
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
                };

                vm.$onInit = function () {
                    vm.questionTypes = [
                        {'type': 'essay', 'name': 'sitnet_toolbar_essay_question'},
                        {'type': 'cloze', 'name': 'sitnet_toolbar_cloze_test_question'},
                        {'type': 'multichoice', 'name': 'sitnet_toolbar_multiplechoice_question'},
                        {'type': 'weighted', 'name': 'sitnet_toolbar_weighted_multiplechoice_question'}];

                    init();
                };

                vm.setQuestionType = function () {
                    vm.question.type = Question.getQuestionType(vm.newType.type);
                    init();
                };

                vm.showWarning = function () {
                    return vm.examNames.length > 1;
                };

                vm.questionOwners = function (filter, criteria) {
                    const data = {
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
                    const i = vm.currentOwners.indexOf(user);
                    if (i >= 0) {
                        vm.currentOwners.splice(i, 1);
                    }
                };

                vm.selectFile = function () {
                    Attachment.selectFile(true).then(function (data) {
                        if (!vm.question.attachment) {
                            vm.question.attachment = {};
                        }
                        vm.question.attachment.modified = true;
                        vm.question.attachment.fileName = data.attachmentFile.name;
                        vm.question.attachment.size = data.attachmentFile.size;
                        vm.question.attachment.file = data.attachmentFile;
                    });
                };

                vm.downloadQuestionAttachment = function () {
                    if (vm.question.attachment.externalId) {
                        Attachment.downloadCollaborativeQuestionAttachment(vm.examId, vm.sectionQuestion);
                        return;
                    }
                    Attachment.downloadQuestionAttachment(vm.question);
                };

                vm.removeQuestionAttachment = function () {
                    Attachment.removeQuestionAttachment(vm.question);
                };

                vm.getFileSize = function () {
                    return Attachment.getFileSize(vm.question.attachment.size);
                };

                vm.hasUploadedAttachment = function () {
                    const a = vm.question.attachment;
                    return a && (a.id || a.externalId);
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
                    const user = Session.getUser();
                    return vm.question.questionOwners && (user.isAdmin ||
                        vm.question.questionOwners.map(function (o) {
                            return o.id;
                        }).indexOf(user.id) > -1
                    );
                };

            }]
    });

