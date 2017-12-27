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
    .component('examCourse', {
        templateUrl: '/assets/app/exam/editor/basic/examCourse.template.html',
        bindings: {
            exam: '<',
            onUpdate: '&'
        },
        controller: ['Exam',
            function (Exam) {

                var vm = this;

                vm.displayGradeScale = function () {
                    return !vm.exam.course || !vm.exam.course.gradeScale ? null :
                        Exam.getScaleDisplayName(vm.exam.course.gradeScale);
                };

                vm.setCourse = function (course) {
                    angular.extend(vm.exam.course, course);
                    vm.onUpdate({course: course});
                }
            }
        ]
    });
