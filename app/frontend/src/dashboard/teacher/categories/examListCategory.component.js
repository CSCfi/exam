/*
 * Copyright (c) 2018 Exam Consortium
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


import toast from 'toastr';

angular.module('app.dashboard.teacher')
    .component('examListCategory', {
        template: require('./examListCategory.template.html'),
        bindings: {
            items: '<',
            examTypes: '<',
            extraColumns: '<?',
            defaultPredicate: '@',
            defaultReverse: '<?',
            onFilterChange: '&'
        },
        controller: ['$translate', '$location', 'dialogs', 'Exam', 'DateTime', 'Session', 'ExamRes',
            function ($translate, $location, dialogs, Exam, DateTime, Session, ExamRes) {

                const vm = this;

                vm.$onInit = function () {
                    vm.extraColumns = vm.extraColumns || [];
                    vm.userId = Session.getUser().id;
                    vm.pageSize = 10;
                    vm.reduceDraftCount = 0;
                    vm.sorting = {
                        predicate: vm.defaultPredicate,
                        reverse: vm.defaultReverse
                    };
                    vm.filterText = $location.search().filter;
                    if (vm.filterText) {
                        search();
                    }
                };

                vm.search = function () {
                    $location.search('filter', vm.filterText);
                    vm.onFilterChange({text: vm.filterText});
                };

                vm.printExamDuration = function (exam) {
                    return DateTime.printExamDuration(exam);
                };

                vm.getUsername = function () {
                    return Session.getUserName();
                };

                vm.getExecutionTypeTranslation = function (exam) {
                    return Exam.getExecutionTypeTranslation(exam.executionType.type);
                };

                vm.checkOwner = function (isOwner) {

                    if (isOwner) {
                        vm.reduceDraftCount += 1;
                        return true;
                    }

                    return false;
                };


                vm.copyExam = function (exam, type) {
                    ExamRes.exams.copy({id: exam.id, type: type}, function (copy) {
                        toast.success($translate.instant('sitnet_exam_copied'));
                        $location.path('/exams/' + copy.id + '/1/');
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

                vm.deleteExam = function (exam) {
                    const dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                    dialog.result.then(function (btn) {
                        ExamRes.exams.remove({id: exam.id}, function (ex) {
                            toast.success($translate.instant('sitnet_exam_removed'));
                            vm.items.splice(vm.items.indexOf(exam), 1);
                        }, function (error) {
                            toast.error(error.data);
                        });
                    }, function (btn) {

                    });
                };

                vm.isOwner = function (exam) {
                    return exam.examOwners.some(eo => eo.id === vm.userId);
                };

            }]
    });
