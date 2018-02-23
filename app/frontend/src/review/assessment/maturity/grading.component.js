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

angular.module('app.review')
    .component('rMaturityGrading', {
        template: require('./grading.template.html'),
        bindings: {
            exam: '<',
            user: '<',
            questionSummary: '<',
            onUpdate: '&'
        },
        controller: ['$translate', '$scope', 'Assessment', 'Exam', 'ExamRes', 'Attachment', 'Language',
            function ($translate, $scope, Assessment, Exam, ExamRes, Attachment, Language) {

                const vm = this;

                vm.$onInit = function () {
                    vm.message = {};
                    vm.selections = {};
                    initGrade();
                    initCreditTypes();
                    initLanguages();
                };

                vm.isUnderLanguageInspection = function () {
                    return vm.user.isLanguageInspector &&
                        vm.exam.languageInspection &&
                        !vm.exam.languageInspection.finishedAt;
                };

                vm.hasGoneThroughLanguageInspection = function () {
                    return vm.exam.languageInspection && vm.exam.languageInspection.finishedAt;
                };

                vm.isAwaitingInspection = function () {
                    return vm.exam.languageInspection && !vm.exam.languageInspection.finishedAt;
                };

                vm.canFinalizeInspection = function () {
                    return vm.exam.languageInspection.statement && vm.exam.languageInspection.statement.comment;
                };

                vm.isReadOnly = function () {
                    return Assessment.isReadOnly(vm.exam);
                };

                vm.isOwnerOrAdmin = function () {
                    return Exam.isOwnerOrAdmin(vm.exam);
                };

                vm.downloadStatementAttachment = function () {
                    Attachment.downloadStatementAttachment(vm.exam);
                };

                vm.getExamMaxPossibleScore = function () {
                    return Exam.getMaxScore(vm.exam);
                };

                vm.getExamTotalScore = function () {
                    return Exam.getTotalScore(vm.exam);
                };

                vm.inspectionDone = function () {
                    vm.onUpdate();
                };

                vm.isOwnerOrAdmin = function () {
                    return Exam.isOwnerOrAdmin(vm.exam);
                };

                vm.isReadOnly = function () {
                    return Assessment.isReadOnly(vm.exam);
                };

                vm.isGraded = function () {
                    return Assessment.isGraded(vm.exam);
                };

                vm.sendEmailMessage = function () {
                    if (!vm.message.text) {
                        toast.error($translate.instant('sitnet_email_empty'));
                        return;
                    }
                    ExamRes.email.inspection({
                        eid: vm.exam.id,
                        msg: vm.message.text
                    }, function () {
                        toast.info($translate.instant('sitnet_email_sent'));
                        delete vm.message.text;
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

                vm.downloadFeedbackAttachment = function () {
                    Attachment.downloadFeedbackAttachment(vm.exam);
                };

                vm.setGrade = function () {
                    if (vm.selections.grade &&
                        (vm.selections.grade.id || vm.selections.grade.type === 'NONE')) {
                        vm.exam.grade = vm.selections.grade;
                        vm.exam.gradeless = vm.selections.grade.type === 'NONE';
                    } else {
                        delete vm.exam.grade;
                        vm.exam.gradeless = false;
                    }
                };

                vm.setCreditType = function () {
                    if (vm.selections.type && vm.selections.type.type) {
                        vm.exam.creditType = { type: vm.selections.type.type };
                    } else {
                        delete vm.exam.creditType;
                    }
                };

                vm.setLanguage = function () {
                    vm.exam.answerLanguage = vm.selections.language ? { code: vm.selections.language.code } : undefined;
                };

                const initGrade = function () {
                    if (!vm.exam.grade || !vm.exam.grade.id) {
                        vm.exam.grade = {};
                    }
                    const scale = vm.exam.gradeScale || vm.exam.parent.gradeScale || vm.exam.course.gradeScale;
                    scale.grades = scale.grades || [];
                    vm.grades = scale.grades.map(function (grade) {
                        grade.type = grade.name;
                        grade.name = Exam.getExamGradeDisplayName(grade.name);

                        if (vm.exam.grade && vm.exam.grade.id === grade.id) {
                            vm.exam.grade.type = grade.type;
                            vm.selections.grade = grade;
                        }
                        return grade;
                    });
                    // The "no grade" option
                    const noGrade = { type: 'NONE', name: Exam.getExamGradeDisplayName('NONE') };
                    if (vm.exam.gradeless && !vm.selections.grade) {
                        vm.selections.grade = noGrade;
                    }
                    vm.grades.push(noGrade);
                };

                const initCreditTypes = function () {
                    Exam.refreshExamTypes().then(function (types) {
                        const creditType = vm.exam.creditType || vm.exam.examType;
                        vm.creditTypes = types;
                        types.forEach(function (type) {
                            if (creditType.id === type.id) {
                                // Reset also exam's credit type in case it was taken from its exam type. Confusing isn't it :)
                                vm.exam.creditType = vm.selections.type = type;
                            }
                        });
                    });
                    if (vm.exam.course && !vm.exam.customCredit) {
                        vm.exam.customCredit = vm.exam.course.credits;
                    }
                };

                const initLanguages = function () {
                    const lang = Assessment.pickExamLanguage(vm.exam);
                    if (!vm.exam.answerLanguage) {
                        vm.exam.answerLanguage = lang;
                    } else {
                        vm.exam.answerLanguage = { code: vm.exam.answerLanguage };
                    }
                    Language.languageApi.query(function (languages) {
                        vm.languages = languages.map(function (language) {
                            if (lang && lang.code === language.code) {
                                vm.selections.language = language;
                            }
                            language.name = Language.getLanguageNativeName(language.code);
                            return language;
                        });
                    });
                };

                $scope.$on('$localeChangeSuccess', function () {
                    initCreditTypes();
                    vm.grades.forEach(function (eg) {
                        eg.name = Exam.getExamGradeDisplayName(eg.type);
                    });
                });

            }
        ]
    });
