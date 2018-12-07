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

angular.module('app.exam.editor')
    .component('autoEvaluation', {
        template: require('./autoEvaluation.template.html'),
        bindings: {
            exam: '<',
            onEnabled: '&',
            onDisabled: '&',
            onUpdate: '&'
        },
        controller: ['Exam',
            function (Exam) {

                const vm = this;
                // TODO: Collaborative exam case, is this needed?

                vm.$onInit = function () {
                    vm.autoevaluation = {
                        releaseTypes: [
                            {
                                name: 'IMMEDIATE',
                                translation: 'sitnet_autoevaluation_release_type_immediate',
                                filtered: true
                            },
                            { name: 'GIVEN_DATE', translation: 'sitnet_autoevaluation_release_type_given_date' },
                            { name: 'GIVEN_AMOUNT_DAYS', translation: 'sitnet_autoevaluation_release_type_given_days' },
                            { name: 'AFTER_EXAM_PERIOD', translation: 'sitnet_autoevaluation_release_type_period' },
                            { name: 'NEVER', translation: 'sitnet_autoevaluation_release_type_never' }
                        ]
                    };
                    vm.autoevaluationDisplay = { visible: false };
                    prepareAutoEvaluationConfig();
                };

                vm.$onChanges = function (props) {
                    if (props.exam && vm.autoevaluation) {
                        prepareAutoEvaluationConfig();
                    }
                }

                const getReleaseTypeByName = function (name) {
                    const matches = vm.autoevaluation.releaseTypes.filter(function (rt) {
                        return rt.name === name;
                    });
                    return matches.length > 0 ? matches[0] : null;
                };


                const prepareAutoEvaluationConfig = function () {
                    vm.autoevaluation.enabled = !!vm.exam.autoEvaluationConfig;
                    if (!vm.exam.autoEvaluationConfig && vm.exam.gradeScale) {
                        vm.exam.autoEvaluationConfig = {
                            releaseType: vm.selectedReleaseType().name || vm.autoevaluation.releaseTypes[0].name,
                            releaseDate: null,
                            gradeEvaluations: vm.exam.gradeScale.grades.map(function (g) {
                                return { grade: angular.copy(g), percentage: 0 };
                            })
                        };
                    }
                    if (vm.exam.autoEvaluationConfig) {
                        vm.exam.autoEvaluationConfig.gradeEvaluations.sort(function (a, b) {
                            return a.grade.id - b.grade.id;
                        });
                        vm.applyFilter(getReleaseTypeByName(vm.exam.autoEvaluationConfig.releaseType));
                    }
                };

                vm.calculateExamMaxScore = function () {
                    return Exam.getMaxScore(vm.exam);
                };

                vm.getGradeDisplayName = function (grade) {
                    return Exam.getExamGradeDisplayName(grade.name);
                };

                vm.calculatePointLimit = function (evaluation) {
                    const max = vm.calculateExamMaxScore();
                    if (evaluation.percentage === 0 || isNaN(evaluation.percentage)) {
                        return 0;
                    }
                    const ratio = max * evaluation.percentage;
                    return (ratio / 100).toFixed(2);
                };

                vm.selectedReleaseType = function () {
                    let type = null;
                    vm.autoevaluation.releaseTypes.some(function (rt) {
                        if (rt.filtered) {
                            type = rt;
                            return true;
                        }
                    });
                    return type;
                };

                vm.applyFilter = function (type) {
                    vm.autoevaluation.releaseTypes.forEach(function (rt) {
                        rt.filtered = false;
                    });
                    type.filtered = !type.filtered;
                    vm.exam.autoEvaluationConfig.releaseType = vm.selectedReleaseType();
                    vm.onUpdate({ config: vm.exam.autoEvaluationConfig });
                };

                vm.releaseDateChanged = function (date) {
                    vm.exam.autoEvaluationConfig.releaseDate = date;
                    vm.onUpdate({ config: vm.exam.autoEvaluationConfig });
                };

                vm.propertyChanged = function () {
                    vm.onUpdate({ config: vm.exam.autoEvaluationConfig });
                };

            }
        ]
    });
