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

angular.module('app.exam.editor')
    .component('basicExamInfo', {
        template: require('./basicExamInfo.template.html'),
        bindings: {
            exam: '<',
            onUpdate: '&',
            onNextTabSelected: '&'
        },
        controller: ['$location', '$scope', '$translate', '$uibModal', 'dialogs', 'Exam', 'ExamRes', 'SettingsResource',
            'Attachment', 'Files',
            function ($location, $scope, $translate, $modal, dialogs, Exam, ExamRes, SettingsResource,
                      Attachment, Files) {

                const vm = this;

                vm.$onInit = function () {
                    refreshExamTypes();
                    refreshGradeScales();
                    SettingsResource.gradeScale.get(function (data) {
                        vm.gradeScaleSetting = data;
                    });
                    initGradeScale();
                };

                vm.$onChanges = function(props) {
                    if (props.exam) {
                        initGradeScale();
                    }
                };

                $scope.$on('$localeChangeSuccess', function () {
                    refreshExamTypes();
                    refreshGradeScales();
                });

                vm.updateExam = function (resetAutoEvaluationConfig) {
                    Exam.updateExam(vm.exam).then(function () {
                        toast.info($translate.instant('sitnet_exam_saved'));
                        if (resetAutoEvaluationConfig) {
                            delete vm.exam.autoEvaluationConfig;
                        }
                        vm.onUpdate({props: {name: vm.exam.name, code: vm.exam.course.code}});
                    }, function (error) {
                        if (error.data) {
                            var msg = error.data.message || error.data;
                            toast.error($translate.instant(msg));
                        }
                    });
                };

                vm.onCourseChange = function (course) {
                    vm.exam.course = course;
                    initGradeScale(); //  Grade scale might need changing based on new course
                    vm.onUpdate({props: {name: vm.exam.name, code: vm.exam.course.code}});
                };

                vm.getExecutionTypeTranslation = function () {
                    return !vm.exam || Exam.getExecutionTypeTranslation(vm.exam.executionType.type);
                };

                vm.checkExamType = function (type) {
                    return vm.exam.examType.type === type ? 'btn-primary' : '';
                };

                vm.setExamType = function (type) {
                    vm.exam.examType.type = type;
                    vm.updateExam();
                };

                vm.getSelectableScales = function () {
                    if (!vm.gradeScales || !vm.exam || !vm.exam.course || angular.isUndefined(vm.gradeScaleSetting)) {
                        return [];
                    }
                    return vm.gradeScales.filter(function (scale) {
                        return vm.gradeScaleSetting.overridable || !vm.exam.course.gradeScale ||
                            vm.exam.course.gradeScale.id === scale.id;
                    });
                };

                vm.checkScale = function (scale) {
                    if (!vm.exam.gradeScale) {
                        return '';
                    }
                    return vm.exam.gradeScale.id === scale.id ? 'btn-primary' : '';
                };

                vm.checkScaleDisabled = function (scale) {
                    if (!scale || !vm.exam.course || !vm.exam.course.gradeScale) {
                        return false;
                    }
                    return !vm.gradeScaleSetting.overridable && vm.exam.course.gradeScale.id === scale.id;
                };

                vm.setScale = function (grading) {
                    vm.exam.gradeScale = grading;
                    vm.updateExam(true);
                };

                vm.selectAttachmentFile = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'attachmentSelector',
                        resolve: {
                            isTeacherModal: function () {
                                return true;
                            }
                        }
                    }).result.then(function (data) {
                        Files.upload('/app/attachment/exam',
                            data.attachmentFile, {examId: vm.exam.id}, vm.exam);
                    });
                };

                vm.downloadExamAttachment = function () {
                    Attachment.downloadExamAttachment(vm.exam);
                };

                vm.removeExamAttachment = function () {
                    Attachment.removeExamAttachment(vm.exam);
                };

                vm.removeExam = function (canRemoveWithoutConfirmation) {
                    if (isAllowedToUnpublishOrRemove()) {
                        const fn = function () {
                            ExamRes.exams.remove({id: vm.exam.id}, function () {
                                toast.success($translate.instant('sitnet_exam_removed'));
                                $location.path('/');
                            }, function (error) {
                                toast.error(error.data);
                            });
                        };
                        if (canRemoveWithoutConfirmation) {
                            fn();
                        } else {
                            const dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                                $translate.instant('sitnet_remove_exam'));
                            dialog.result.then(function () {
                                fn();
                            });
                        }
                    } else {
                        toast.warning($translate.instant('sitnet_exam_removal_not_possible'));
                    }
                };

                vm.nextTab = function () {
                    vm.onNextTabSelected();
                };

                const isAllowedToUnpublishOrRemove = function () {
                    // allowed if no upcoming reservations and if no one has taken this yet
                    return !vm.exam.hasEnrolmentsInEffect && vm.exam.children.length === 0;
                };

                const refreshExamTypes = function () {
                    Exam.refreshExamTypes().then(function (types) {
                        // Maturity can only have a FINAL type
                        if (vm.exam.executionType.type === 'MATURITY') {
                            types = types.filter(function (t) {
                                return t.type === 'FINAL';
                            });
                        }
                        vm.examTypes = types;
                    });
                };

                const refreshGradeScales = function () {
                    Exam.refreshGradeScales().then(function (scales) {
                        vm.gradeScales = scales;
                    });
                };

                const initGradeScale = function () {
                    // Set exam grade scale from course default if not specifically set for exam
                    if (!vm.exam.gradeScale && vm.exam.course && vm.exam.course.gradeScale) {
                        vm.exam.gradeScale = vm.exam.course.gradeScale;
                    }
                };
            }
        ]
    });
