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
        controller: ['$q', '$translate', '$location', 'dialogs', 'ExamRes', 'examService',
            function ($q, $translate, $location, dialogs, ExamRes, examService) {

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
                            toastr.info($translate.instant('sitnet_sections_reordered'));
                        });
                    }
                };

                vm.addNewSection = function () {
                    var newSection = {
                        expanded: true,
                        questions: []
                    };

                    ExamRes.sections.insert({eid: vm.exam.id}, newSection, function (section) {
                        toastr.success($translate.instant('sitnet_section_added'));
                        vm.exam.examSections.push(section);
                        updateSectionIndices();
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                vm.updateExam = function (silent) {
                    var deferred = $q.defer();
                    examService.updateExam(vm.exam).then(function () {
                        if (!silent){
                            toastr.info($translate.instant('sitnet_exam_saved'));
                        }
                        deferred.resolve();
                    }, function (error) {
                        if (error.data) {
                            var msg = error.data.message || error.data;
                            toastr.error($translate.instant(msg));
                        }
                        deferred.reject();
                    });
                    return deferred.promise;
                };

                vm.previewExam = function (fromTab) {
                    //First save the exam
                    // TODO: Is this really necessary anymore?
                    vm.updateExam(true).then(function () {
                        var resource = vm.exam.executionType.type === 'PRINTOUT' ? 'printout' : 'preview';
                        $location.path('/exams/' + resource + '/' + vm.exam.id + '/' + fromTab);
                    });
                };

                vm.removeExam = function () {
                    if (isAllowedToUnpublishOrRemove()) {
                        var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                        dialog.result.then(function () {
                            ExamRes.exams.remove({id: vm.exam.id}, function () {
                                toastr.success($translate.instant('sitnet_exam_removed'));
                                $location.path('/');
                            }, function (error) {
                                toastr.error(error.data);
                            });
                        });
                    } else {
                        toastr.warning($translate.instant('sitnet_exam_removal_not_possible'));
                    }
                };

                vm.removeSection = function(section) {
                    ExamRes.sections.remove({eid: vm.exam.id, sid: section.id}, function (id) {
                        toastr.info($translate.instant('sitnet_section_removed'));
                        vm.exam.examSections.splice(vm.exam.examSections.indexOf(section), 1);
                        updateSectionIndices();
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                vm.calculateExamMaxScore = function () {
                    return examService.getMaxScore(vm.exam);
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
