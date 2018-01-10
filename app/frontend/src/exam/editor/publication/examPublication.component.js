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
import moment from 'moment';
import toast from 'toastr';
import _ from 'lodash';

angular.module('app.exam.editor')
    .component('examPublication', {
        template: require('./examPublication.template.html'),
        bindings: {
            exam: '<',
            onPreviousTabSelected: '&',
            onNextTabSelected: '&?'
        },
        controller: ['$q', '$translate', '$location', '$uibModal', 'Session', 'Exam', 'ExamRes', 'SettingsResource',
            function ($q, $translate, $location, $modal, Session, Exam, ExamRes, SettingsResource) {

                const vm = this;

                vm.$onInit = function () {
                    vm.newExaminationDate = {
                        'date': new Date()
                    };
                    SettingsResource.examDurations.get(function (data) {
                        vm.examDurations = data.examDurations;
                    });
                    vm.user = Session.getUser();
                    vm.hostName = window.location.origin;
                    vm.autoevaluation = {
                        enabled: !!vm.exam.autoEvaluationConfig
                    };
                };

                vm.examinationDateChanged = function (date) {
                    vm.newExaminationDate.date = date;
                };

                vm.addExaminationDate = function (date) {
                    const alreadyExists = vm.exam.examinationDates.map(function (ed) {
                        return moment(ed.date).format('L');
                    }).some(function (ed) {
                        return ed === moment(date).format('L');
                    });
                    if (!alreadyExists) {
                        ExamRes.examinationDate.create({eid: vm.exam.id, date: date}, function (data) {
                            vm.exam.examinationDates.push(data);
                        });
                    }
                };

                vm.removeExaminationDate = function (date) {
                    ExamRes.examinationDate.delete({eid: vm.exam.id, edid: date.id}, function () {
                        const i = vm.exam.examinationDates.indexOf(date);
                        vm.exam.examinationDates.splice(i, 1);
                    });
                };

                vm.startDateChanged = function (date) {
                    vm.exam.examActiveStartDate = date;
                };

                vm.endDateChanged = function (date) {
                    vm.exam.examActiveEndDate = date;
                };

                vm.autoEvaluationConfigChanged = function (config) {
                    angular.extend(vm.exam.autoEvaluationConfig, config);
                };

                vm.updateExam = function (silent, overrides) {
                    const deferred = $q.defer();
                    const config = {
                        'evaluationConfig': vm.autoevaluation.enabled && vm.canBeAutoEvaluated() ? {
                            releaseType: vm.exam.autoEvaluationConfig.releaseType.name,
                            releaseDate: new Date(vm.exam.autoEvaluationConfig.releaseDate).getTime(),
                            amountDays: vm.exam.autoEvaluationConfig.amountDays,
                            gradeEvaluations: vm.exam.autoEvaluationConfig.gradeEvaluations
                        } : null
                    };
                    angular.extend(config, overrides);
                    Exam.updateExam(vm.exam, config).then(function () {
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

                vm.setExamDuration = function (duration) {
                    vm.exam.duration = duration;
                    vm.updateExam();
                };

                vm.checkDuration = function (duration) {
                    return vm.exam.duration === duration ? 'btn-primary' : '';
                };

                vm.range = function (min, max, step) {
                    step |= 1;
                    const input = [];
                    for (let i = min; i <= max; i += step) {
                        input.push(i);
                    }
                    return input;
                };

                vm.checkTrialCount = function (x) {
                    return vm.exam.trialCount === x ? 'btn-primary' : '';
                };

                vm.setTrialCount = function (x) {
                    vm.exam.trialCount = x;
                    vm.updateExam();
                };

                vm.canBeAutoEvaluated = function () {
                    return Exam.hasQuestions(vm.exam) && !Exam.hasEssayQuestions(vm.exam) &&
                        vm.exam.gradeScale && vm.exam.executionType.type !== 'MATURITY';
                };

                vm.previewExam = function (fromTab) {
                    const resource = vm.exam.executionType.type === 'PRINTOUT' ? 'printout' : 'preview';
                    $location.path('/exams/' + vm.exam.id + '/view/' + resource + '/' + fromTab);
                };

                vm.nextTab = function () {
                    vm.onNextTabSelected();
                };

                vm.previousTab = function () {
                    vm.onPreviousTabSelected();
                };

                vm.saveAndPublishExam = function () {

                    const err = readyForPublishing();

                    if (Object.getOwnPropertyNames(err) && Object.getOwnPropertyNames(err).length > 0) {

                        $modal.open({
                            template: require('./publication_error_dialog.html'),
                            backdrop: 'static',
                            keyboard: true,
                            controller: function ($scope, $uibModalInstance) {
                                $scope.errors = err;
                                $scope.ok = function () {
                                    $uibModalInstance.dismiss();
                                };
                            },
                            resolve: {
                                errors: function () {
                                    return err;
                                }
                            }
                        });
                    } else {
                        $modal.open({
                            template: require('./publication_dialog.html'),
                            backdrop: 'static',
                            keyboard: true,
                            controller: function ($scope, $uibModalInstance) {
                                $scope.getConfirmationText = function () {
                                    let confirmation = $translate.instant('sitnet_publish_exam_confirm');
                                    if (vm.exam.executionType.type !== 'PRINTOUT') {
                                        confirmation += ' ' + $translate.instant('sitnet_publish_exam_confirm_enroll');
                                    }
                                    return confirmation;
                                };
                                $scope.ok = function () {
                                    $uibModalInstance.close();
                                };
                                $scope.cancel = function () {
                                    $uibModalInstance.dismiss();
                                };
                            }
                        }).result.then(function () {
                            // OK button clicked
                            vm.updateExam(true, {'state': 'PUBLISHED'}).then(function () {
                                toast.success($translate.instant('sitnet_exam_saved_and_published'));
                                $location.path('/');
                            });
                        });
                    }
                };


                // TODO: how should this work when it comes to private exams?
                vm.unpublishExam = function () {
                    if (isAllowedToUnpublishOrRemove()) {
                        $modal.open({
                            template: require('./publication_revoke_dialog.html'),
                            backdrop: 'static',
                            keyboard: true,
                            controller: function ($scope, $uibModalInstance) {
                                $scope.ok = function () {
                                    $uibModalInstance.close();
                                };
                                $scope.cancel = function () {
                                    $uibModalInstance.dismiss();
                                };
                            }
                        }).result.then(function () {
                            vm.updateExam(true, {'state': 'SAVED'}).then(function () {
                                toast.success($translate.instant('sitnet_exam_unpublished'));
                                vm.exam.state = 'SAVED';
                            });
                        }, function (error) {
                            // Cancel button clicked
                        });
                    } else {
                        toast.warning($translate.instant('sitnet_unpublish_not_possible'));
                    }
                };

                vm.autoEvaluationDisabled = function () {
                    vm.autoevaluation.enabled = false;
                };

                vm.autoEvaluationEnabled = function () {
                    vm.autoevaluation.enabled = true;
                };

                const isAllowedToUnpublishOrRemove = function () {
                    // allowed if no upcoming reservations and if no one has taken this yet
                    return !vm.exam.hasEnrolmentsInEffect && vm.exam.children.length === 0;
                };


                const countQuestions = function () {
                    return vm.exam.examSections.reduce(function (a, b) {
                        return a + b.sectionQuestions.length;
                    }, 0);
                };

                const hasDuplicatePercentages = function () {
                    var percentages = vm.exam.autoEvaluationConfig.gradeEvaluations.map(function (e) {
                        return e.percentage;
                    }).sort();
                    for (var i = 0; i < percentages.length - 1; ++i) {
                        if (percentages[i + 1] === percentages[i]) {
                            return true;
                        }
                    }
                    return false;
                };


                const readyForPublishing = function () {

                    const errors = {};

                    if (!vm.exam.course) {
                        errors.course = $translate.instant('sitnet_course_missing');
                    }

                    if (!vm.exam.name || vm.exam.name.length < 2) {
                        errors.name = $translate.instant('sitnet_exam_name_missing_or_too_short');
                    }

                    if (vm.exam.examLanguages.length === 0) {
                        errors.name = $translate.instant('sitnet_error_exam_empty_exam_language');
                    }

                    const isPrintout = vm.exam.executionType.type === 'PRINTOUT';
                    if (!isPrintout && !vm.exam.examActiveStartDate) {
                        errors.examActiveStartDate = $translate.instant('sitnet_exam_start_date_missing');
                    }

                    if (!isPrintout && !vm.exam.examActiveEndDate) {
                        errors.examActiveEndDate = $translate.instant('sitnet_exam_end_date_missing');
                    }
                    if (isPrintout && vm.exam.examinationDates.length === 0) {
                        errors.examinationDates = $translate.instant('sitnet_examination_date_missing');
                    }

                    if (countQuestions() === 0) {
                        errors.questions = $translate.instant('sitnet_exam_has_no_questions');
                    }

                    if (!vm.exam.duration) {
                        errors.duration = $translate.instant('sitnet_exam_duration_missing');
                    }

                    if (!vm.exam.gradeScale) {
                        errors.grading = $translate.instant('sitnet_exam_grade_scale_missing');
                    }

                    if (!vm.exam.examType) {
                        errors.examType = $translate.instant('sitnet_exam_credit_type_missing');
                    }

                    const allSectionsNamed = vm.exam.examSections.every(function (section) {
                        return section.name;
                    });
                    if (!allSectionsNamed) {
                        errors.sectionNames = $translate.instant('sitnet_exam_contains_unnamed_sections');
                    }
                    if (['PRIVATE', 'MATURITY'].indexOf(vm.exam.executionType.type) > -1 && vm.exam.examEnrolments.length < 1) {
                        errors.participants = $translate.instant('sitnet_no_participants');
                    }
                    if (vm.exam.executionType.type === 'MATURITY' && !_.isBoolean(vm.exam.subjectToLanguageInspection)) {
                        errors.languageInspection = $translate.instant('sitnet_language_inspection_setting_not_chosen');
                    }

                    if (vm.autoevaluation.enabled && hasDuplicatePercentages(exam)) {
                        errors.autoevaluation = $translate.instant('sitnet_autoevaluation_percentages_not_unique');
                    }

                    return errors;
                };


            }
        ]
    });
