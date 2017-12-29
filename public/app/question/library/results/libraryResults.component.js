'use strict';
angular.module('app.question')
    .component('libraryResults', {
        templateUrl: '/assets/app/question/library/results/libraryResults.template.html',
        bindings: {
            onSelection: '&',
            onCopy: '&',
            questions: '<',
            disableLinks: '<',
            tableClass: '@?'
        },
        controller: ['$translate', 'dialogs', 'Question', 'Library', 'Attachment', 'Session', 'toast',
            function ($translate, dialogs, Question, Library, Attachment, Session, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    vm.allSelected = false;
                    vm.pageSize = 25;
                    vm.currentPage = 0;
                    vm.tableClass = vm.tableClass || 'exams-table';
                    var storedData = Library.loadFilters('sorting');
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

                var saveFilters = function () {
                    var filters = {
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

                var resetSelections = function () {
                    vm.questions.forEach(function (q) {
                        q.selected = false;
                    });
                    vm.questionSelected();
                };

                vm.questionSelected = function () {
                    var selections = vm.questions.filter(function (q) {
                        return q.selected;
                    }).map(function (q) {
                        return q.id;
                    });
                    vm.onSelection({selections: selections});
                };

                vm.deleteQuestion = function (question) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_question_from_library_only'));
                    dialog.result.then(function (btn) {
                        Question.questionsApi.delete({id: question.id}, function () {
                            vm.questions.splice(vm.questions.indexOf(question), 1);
                            toast.info($translate.instant('sitnet_question_removed'));
                        });
                    });
                };

                vm.copyQuestion = function (question) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_copy_question'));
                    dialog.result.then(function (btn) {
                        Question.questionCopyApi.copy({id: question.id}, function (copy) {
                            vm.questions.splice(vm.questions.indexOf(question), 0, copy);
                            vm.onCopy({copy: copy});
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
                    var s = owner.firstName + ' ' + owner.lastName;
                    if (showId && owner.userIdentifier) {
                        s += " (" + owner.userIdentifier + ")";
                    }
                    return s;
                };

                vm.printTags = function (question) {
                    return question.tags.map (function (t) {
                        return t.name.toUpperCase();
                    }).join(', ');
                };

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
                }


            }
        ]
    });

