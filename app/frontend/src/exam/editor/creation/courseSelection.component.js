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
    .component('courseSelection', {
        template: require('./courseSelection.template.html'),
        controller: ['$translate', '$location', '$routeParams', 'ExamRes', 'Exam',
            function ($translate, $location, $routeParams, ExamRes, Exam) {

                const vm = this;

                vm.$onInit = function () {
                    ExamRes.exams.get({ id: $routeParams.id }, function (exam) {
                        vm.exam = exam;
                    });
                };

                vm.getExecutionTypeTranslation = function () {
                    return !vm.exam || Exam.getExecutionTypeTranslation(vm.exam.executionType.type);
                };

                vm.updateExamName = function () {
                    Exam.updateExam(vm.exam).then(function () {
                        toast.info($translate.instant('sitnet_exam_saved'));
                    }, function (error) {
                        if (error.data) {
                            const msg = error.data.message || error.data;
                            toast.error($translate.instant(msg));
                        }
                    });
                };

                vm.onCourseSelected = function ($event) {
                    ExamRes.course.update({ eid: vm.exam.id, cid: course.id }, function () {
                        toast.success($translate.instant('sitnet_exam_associated_with_course'));
                        vm.exam.course = course;
                    });
                }

                vm.cancelNewExam = function () {
                    ExamRes.exams.remove({ id: vm.exam.id }, function () {
                        toast.success($translate.instant('sitnet_exam_removed'));
                        $location.path('/');
                    });
                };

                vm.continueToExam = function () {
                    $location.path('/exams/' + vm.exam.id + '/1');
                };

            }
        ]
    });
