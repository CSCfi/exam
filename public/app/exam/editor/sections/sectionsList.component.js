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

'use strict';

angular.module('app.exam.editor')
    .component('sections', {
        templateUrl: '/assets/app/exam/editor/sections/sectionsList.template.html',
        bindings: {
            exam: '<',
            onNextTabSelected: '&',
            onPreviousTabSelected: '&',
            onNewLibraryQuestion: '&'
        },
        controller: ['$q', '$translate', '$location', 'dialogs', 'ExamRes', 'Exam', 'toast',
            function ($q, $translate, $location, dialogs, ExamRes, Exam, toast) {

                var vm = this;

                var init = function () {
                    vm.exam.examSections.sort(function (a, b) {
                        return a.sequenceNumber - b.sequenceNumber;
                    });
                    updateSectionIndices();
                };

                vm.$onInit = function () {
                    init();
                };

                vm.$onChanges = function (changes) {
                    if (changes.exam) {
                        init();
                    }
                };

                vm.moveSection = function (section, from, to) {
                    if (from >= 0 && to >= 0 && from !== to) {
                        ExamRes.sectionOrder.update({
                            eid: vm.exam.id,
                            from: from,
                            to: to
                        }, function () {
                            updateSectionIndices();
                            toast.info($translate.instant('sitnet_sections_reordered'));
                        });
                    }
                };

                vm.addNewSection = function () {
                    var newSection = {
                        expanded: true,
                        questions: []
                    };

                    ExamRes.sections.insert({eid: vm.exam.id}, newSection, function (section) {
                        toast.success($translate.instant('sitnet_section_added'));
                        vm.exam.examSections.push(section);
                        updateSectionIndices();
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

                vm.updateExam = function (silent) {
                    var deferred = $q.defer();
                    Exam.updateExam(vm.exam).then(function () {
                        if (!silent) {
                            toast.info($translate.instant('sitnet_exam_saved'));
                        }
                        deferred.resolve();
                    }, function (error) {
                        if (error.data) {
                            var msg = error.data.message || error.data;
                            toast.error($translate.instant(msg));
                        }
                        deferred.reject();
                    });
                    return deferred.promise;
                };

                vm.previewExam = function (fromTab) {
                    var resource = vm.exam.executionType.type === 'PRINTOUT' ? 'printout' : 'preview';
                    $location.path('/exams/' + vm.exam.id + '/view/' + resource + '/' + fromTab);
                };

                vm.removeExam = function () {
                    if (isAllowedToUnpublishOrRemove()) {
                        var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                        dialog.result.then(function () {
                            ExamRes.exams.remove({id: vm.exam.id}, function () {
                                toast.success($translate.instant('sitnet_exam_removed'));
                                $location.path('/');
                            }, function (error) {
                                toast.error(error.data);
                            });
                        });
                    } else {
                        toast.warning($translate.instant('sitnet_exam_removal_not_possible'));
                    }
                };

                vm.removeSection = function (section) {
                    ExamRes.sections.remove({eid: vm.exam.id, sid: section.id}, function (id) {
                        toast.info($translate.instant('sitnet_section_removed'));
                        vm.exam.examSections.splice(vm.exam.examSections.indexOf(section), 1);
                        updateSectionIndices();
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

                vm.calculateExamMaxScore = function () {
                    return Exam.getMaxScore(vm.exam);
                };

                vm.nextTab = function () {
                    vm.onNextTabSelected();
                };

                vm.previousTab = function () {
                    vm.onPreviousTabSelected();
                };

                vm.onReloadRequired = function () {
                    vm.onNewLibraryQuestion();
                };

                var isAllowedToUnpublishOrRemove = function () {
                    // allowed if no upcoming reservations and if no one has taken this yet
                    return !vm.exam.hasEnrolmentsInEffect && vm.exam.children.length === 0;
                };

                var updateSectionIndices = function () {
                    // set sections and question numbering
                    angular.forEach(vm.exam.examSections, function (section, index) {
                        section.index = index + 1;
                    });
                };

            }]
    });
