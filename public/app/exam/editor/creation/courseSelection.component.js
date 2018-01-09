/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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
    .component('courseSelection', {
        templateUrl: '/assets/app/exam/editor/creation/courseSelection.template.html',
        controller: ['$translate', '$q', '$location', '$routeParams', 'ExamRes', 'Exam', 'toast',
            function ($translate, $q, $location, $routeParams, ExamRes, Exam, toast) {

                var vm = this;

                vm.$onInit = function () {
                    ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                        vm.exam = exam;
                    });
                };

                vm.getExecutionTypeTranslation = function () {
                    return !vm.exam || Exam.getExecutionTypeTranslation(vm.exam.executionType.type);
                };

                vm.updateExamName = function () {
                    Exam.updateExam(vm.exam).then(function () {
                        toast.info($translate.instant("sitnet_exam_saved"));
                    }, function (error) {
                        if (error.data) {
                            var msg = error.data.message || error.data;
                            toast.error($translate.instant(msg));
                        }
                    });
                };

                vm.cancelNewExam = function () {
                    ExamRes.exams.remove({id: vm.exam.id}, function () {
                        toast.success($translate.instant('sitnet_exam_removed'));
                        $location.path('/');
                    });
                };

                vm.continueToExam = function () {
                    $location.path("/exams/" + vm.exam.id + "/1");
                };

            }
        ]
    });
