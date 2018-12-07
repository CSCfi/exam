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
    .component('libraryResults', {
        template: require('./libraryResults.template.html'),
        bindings: {
            onSelection: '&',
            onCopy: '&',
            questions: '<',
            disableLinks: '<',
            tableClass: '@?'
        },
        controller: ['$translate', 'dialogs', 'Question', 'Library', 'Attachment', 'Session',
            function ($translate, dialogs, Question, Library, Attachment, Session) {

                const vm = this;

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    vm.allSelected = false;
                    vm.pageSize = 25;
                    vm.currentPage = 0;
                    vm.tableClass = vm.tableClass || 'exams-table';
                    const storedData = Library.loadFilters('sorting');
                    if (storedData.filters) {
                        vm.questionsPredicate = storedData.filters.predicate;
                        vm.reverse = storedData.filters.reverse;
                    }
                };

                vm.$onChanges = function (props) {
                    if (props.questions) {
                        vm.currentPage = 0;
                        resetSelections();
                    }
                };

                vm.onSort = function () {
                    saveFilters();
                };

                const saveFilters = function () {
                    const filters = {
                        predicate: vm.questionsPredicate,
                        reverse: vm.reverse
                    };
                    Library.storeFilters(filters, 'sorting');
                };

                vm.selectAll = function () {
                    vm.questions.forEach(function (q) {
                        q.selected = vm.allSelected;
                    });
                    vm.questionSelected();
                };

                const resetSelections = function () {
                    vm.questions.forEach(function (q) {
                        q.selected = false;
                    });
                    vm.questionSelected();
                };

                vm.questionSelected = function () {
                    const selections = vm.questions.filter(function (q) {
                        return q.selected;
                    }).map(function (q) {
                        return q.id;
                    });
                    vm.onSelection({ selections: selections });
                };

                vm.deleteQuestion = function (question) {
                    const dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                        $translate.instant('sitnet_remove_question_from_library_only'));
                    dialog.result.then(function (btn) {
                        Question.questionsApi.delete({ id: question.id }, function () {
                            vm.questions.splice(vm.questions.indexOf(question), 1);
                            toast.info($translate.instant('sitnet_question_removed'));
                        });
                    });
                };

                vm.copyQuestion = function (question) {
                    const dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                        $translate.instant('sitnet_copy_question'));
                    dialog.result.then(function (btn) {
                        Question.questionCopyApi.copy({ id: question.id }, function (copy) {
                            vm.questions.splice(vm.questions.indexOf(question), 0, copy);
                            vm.onCopy({ copy: copy });
                        });
                    });
                };

                vm.downloadQuestionAttachment = function (question) {
                    Attachment.downloadQuestionAttachment(question);
                };

                vm.printOwners = function (question) {
                    return question.questionOwners.map(function (o) {
                        return vm.printOwner(o, false);
                    }).join(', ');
                };

                vm.printOwner = function (owner, showId) {
                    let s = owner.firstName + ' ' + owner.lastName;
                    if (showId && owner.userIdentifier) {
                        s += ' (' + owner.userIdentifier + ')';
                    }
                    return s;
                };

                vm.printTags = function (question) {
                    return question.tags.map(function (t) {
                        return t.name.toUpperCase();
                    }).join(', ');
                };

                vm.pageSelected = function (page) {
                    vm.currentPage = page;
                }

                vm.getQuestionTypeIcon = function (question) {
                    switch (question.type) {
                        case 'EssayQuestion':
                            return 'fa-edit';
                        case 'MultipleChoiceQuestion':
                            return 'fa-list-ul';
                        case 'WeightedMultipleChoiceQuestion':
                            return 'fa-balance-scale';
                        case 'ClozeTestQuestion':
                            return 'fa-terminal';
                    }
                    return '';
                };

                vm.getQuestionTypeText = function (question) {
                    switch (question.type) {
                        case 'EssayQuestion':
                            return 'sitnet_essay';
                        case 'MultipleChoiceQuestion':
                            return 'sitnet_question_mc';
                        case 'WeightedMultipleChoiceQuestion':
                            return 'sitnet_question_weighted_mc';
                        case 'ClozeTestQuestion':
                            return 'sitnet_toolbar_cloze_test_question';
                    }
                    return '';
                };

            }
        ]
    });

