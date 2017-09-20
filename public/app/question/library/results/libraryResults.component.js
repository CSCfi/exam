'use strict';
angular.module('app.question')
    .component('libraryResults', {
        templateUrl: '/assets/app/question/library/results/libraryResults.template.html',
        bindings: {
            onSelection: '&',
            questions: '<',
            allowEditing: '<',
            tableClass: '@?'
        },
        controller: ['$location', 'dialogs', 'QuestionRes', 'questionService', 'Attachment',
            function ($location, dialogs, QuestionRes, questionService, Attachment) {

                var vm = this;

                vm.$onInit = function () {
                    vm.pageSize = 25;
                    vm.currentPage = 0;
                    vm.tableClass = vm.tableClass || 'exams-table';
                    var storedData = questionService.loadFilters('sorting');
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
                    questionService.storeFilters(filters, 'sorting');
                };

                vm.selectAll = function (selectAllCssClass, checkboxesCssClass) {
                    var isSelected = angular.element('.' + selectAllCssClass).prop('checked');
                    angular.forEach(angular.element('.' + checkboxesCssClass), function (input) {
                        angular.element(input).prop('checked', isSelected);
                    });
                };

                var resetSelections = function () {
                    angular.forEach(angular.element('.questionToUpdate'), function (input) {
                        angular.element(input).attr('checked', false);
                    });
                    vm.onSelection({count: 0});
                };

                vm.questionSelected = function () {
                    var selectionCount = 0;
                    angular.forEach(angular.element('.questionToUpdate'), function (input) {
                        if (angular.element(input).prop('checked')) {
                            selectionCount++;
                        }

                    });
                    vm.onSelection({count: selectionCount});
                };

                vm.deleteQuestion = function (question) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_question_from_library_only'));
                    dialog.result.then(function (btn) {
                        QuestionRes.questions.delete({id: question.id}, function () {
                            vm.questions.splice(vm.questions.indexOf(question), 1);
                            vm.applyFreeSearchFilter();
                            toastr.info($translate.instant('sitnet_question_removed'));
                        });
                    });
                };

                vm.copyQuestion = function (question) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_copy_question'));
                    dialog.result.then(function (btn) {
                        QuestionRes.question.copy({id: question.id}, function (copy) {
                            toastr.info($translate.instant('sitnet_question_copied'));
                            // CHECK THIS WITH THE MODAL USAGE
                            $location.path('/questions/' + copy.id);
                        });
                    });
                };

                vm.downloadQuestionAttachment = function (question) {
                    Attachment.downloadQuestionAttachment(question);
                };


            }
        ]
    });

