'use strict';

angular.module('app.exam.editor')
    .component('autoEvaluation', {
        templateUrl: '/assets/app/exam/editor/publication/autoEvaluation.template.html',
        bindings: {
            exam: '<',
            onEnabled: '&',
            onDisabled: '&',
            onUpdate: '&'
        },
        controller: ['Exam',
            function (Exam) {

                var vm = this;

                vm.$onInit = function () {
                    vm.autoevaluation = {
                        releaseTypes: [
                            {
                                name: 'IMMEDIATE',
                                translation: 'sitnet_autoevaluation_release_type_immediate',
                                filtered: true
                            },
                            {name: 'GIVEN_DATE', translation: 'sitnet_autoevaluation_release_type_given_date'},
                            {name: 'GIVEN_AMOUNT_DAYS', translation: 'sitnet_autoevaluation_release_type_given_days'},
                            {name: 'AFTER_EXAM_PERIOD', translation: 'sitnet_autoevaluation_release_type_period'},
                            {name: 'NEVER', translation: 'sitnet_autoevaluation_release_type_never'}
                        ]
                    };
                    vm.autoevaluationDisplay = {visible: false};
                    prepareAutoEvaluationConfig();
                };

                var getReleaseTypeByName = function (name) {
                    var matches = vm.autoevaluation.releaseTypes.filter(function (rt) {
                        return rt.name === name;
                    });
                    return matches.length > 0 ? matches[0] : null;
                };


                var prepareAutoEvaluationConfig = function () {
                    vm.autoevaluation.enabled = !!vm.exam.autoEvaluationConfig;
                    if (!vm.exam.autoEvaluationConfig && vm.exam.gradeScale) {
                        vm.exam.autoEvaluationConfig = {
                            releaseType: vm.selectedReleaseType().name || vm.autoevaluation.releaseTypes[0].name,
                            gradeEvaluations: vm.exam.gradeScale.grades.map(function (g) {
                                return {grade: angular.copy(g), percentage: 0};
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
                    var max = vm.calculateExamMaxScore();
                    if (evaluation.percentage === 0 || isNaN(evaluation.percentage)) {
                        return 0;
                    }
                    var ratio = max * evaluation.percentage;
                    return (ratio / 100).toFixed(2);
                };

                vm.selectedReleaseType = function () {
                    var type = null;
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
                    vm.onUpdate({config: vm.exam.autoEvaluationConfig});
                };

                vm.releaseDateChanged = function (date) {
                    vm.exam.autoEvaluationConfig.releaseDate = date;
                    vm.onUpdate({config: vm.exam.autoEvaluationConfig});
                };

                vm.propertyChanged = function () {
                    vm.onUpdate({config: vm.exam.autoEvaluationConfig});
                };

            }
        ]
    });
