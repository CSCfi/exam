'use strict';

angular.module('app.exam.editor')
    .component('basicExamInfo', {
        templateUrl: '/assets/app/exam/editor/basic/basicExamInfo.template.html',
        bindings: {
            exam: '<',
            onUpdate: '&',
            onNextTabSelected: '&'
        },
        controller: ['$location', '$scope', '$translate', '$uibModal', 'dialogs', 'examService', 'ExamRes', 'SettingsResource', 'Attachment', 'fileService',
            function ($location, $scope, $translate, $modal, dialogs, examService, ExamRes, SettingsResource, Attachment, fileService) {

                var vm = this;

                vm.$onInit = function () {
                    refreshExamTypes();
                    refreshGradeScales();
                    SettingsResource.gradeScale.get(function (data) {
                        vm.gradeScaleSetting = data;
                    });
                    initGradeScale();
                };

                $scope.$on('$localeChangeSuccess', function () {
                    refreshExamTypes();
                    refreshGradeScales();
                });

                vm.updateExam = function (resetAutoEvaluationConfig) {
                    examService.updateExam(vm.exam).then(function () {
                        toastr.info($translate.instant('sitnet_exam_saved'));
                        if (resetAutoEvaluationConfig) {
                            delete vm.exam.autoEvaluationConfig;
                        }
                        vm.onUpdate({props: {name: vm.exam.name, code: vm.exam.course.code}});
                    }, function (error) {
                        if (error.data) {
                            var msg = error.data.message || error.data;
                            toastr.error($translate.instant(msg));
                        }
                    });
                };

                vm.onCourseChange = function (course) {
                    vm.exam.course = course;
                    initGradeScale(); //  Grade scale might need changing based on new course
                    vm.onUpdate({props: {name: vm.exam.name, code: vm.exam.course.code}});
                };

                vm.getExecutionTypeTranslation = function () {
                    return !vm.exam || examService.getExecutionTypeTranslation(vm.exam.executionType.type);
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
                        fileService.upload('/app/attachment/exam',
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
                        var fn = function () {
                            ExamRes.exams.remove({id: vm.exam.id}, function () {
                                toastr.success($translate.instant('sitnet_exam_removed'));
                                $location.path('/');
                            }, function (error) {
                                toastr.error(error.data);
                            });
                        };
                        if (canRemoveWithoutConfirmation) {
                            fn();
                        } else {
                            var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                            dialog.result.then(function () {
                                fn();
                            });
                        }
                    } else {
                        toastr.warning($translate.instant('sitnet_exam_removal_not_possible'));
                    }
                };

                vm.nextTab = function () {
                    vm.onNextTabSelected();
                };

                var isAllowedToUnpublishOrRemove = function () {
                    // allowed if no upcoming reservations and if no one has taken this yet
                    return !vm.exam.hasEnrolmentsInEffect && vm.exam.children.length === 0;
                };

                var refreshExamTypes = function () {
                    examService.refreshExamTypes().then(function (types) {
                        // Maturity can only have a FINAL type
                        if (vm.exam.executionType.type === 'MATURITY') {
                            types = types.filter(function (t) {
                                return t.type === 'FINAL';
                            });
                        }
                        vm.examTypes = types;
                    });
                };

                var refreshGradeScales = function () {
                    examService.refreshGradeScales().then(function (scales) {
                        vm.gradeScales = scales;
                    });
                };

                var initGradeScale = function () {
                    // Set exam grade scale from course default if not specifically set for exam
                    if (!vm.exam.gradeScale && vm.exam.course && vm.exam.course.gradeScale) {
                        vm.exam.gradeScale = vm.exam.course.gradeScale;
                    }
                };
            }
        ]
    });
