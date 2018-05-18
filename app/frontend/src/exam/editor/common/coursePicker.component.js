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
    .component('coursePicker', {
        template: require('./coursePicker.template.html'),
        bindings: {
            exam: '<',
            onUpdate: '&'
        },
        controller: ['$http', '$translate', 'Course', 'ExamRes',
            function ($http, $translate, Course, ExamRes) {

                const vm = this;

                vm.getCourses = function (filter, criteria) {
                    toggleLoadingIcon(filter, true);
                    const tmp = criteria;
                    if (vm.exam && vm.exam.course && vm.exam.course.id) {
                        delete vm.exam.course;
                        setInputValue(filter, tmp);

                        ExamRes.course.delete({eid: vm.exam.id}, function (updated_exam) {
                            vm.exam = updated_exam;
                            setInputValue(filter, tmp);
                        });
                    }
                    return Course.courseApi.query({filter: filter, q: criteria}).$promise.then(
                        function (courses) {
                            toggleLoadingIcon(filter, false);

                            if (!courses || !courses.hasOwnProperty('length') || courses.length === 0) {
                                toast.error($translate.instant('sitnet_course_not_found') + ' ( ' + tmp + ' )');
                            }
                            return courses;
                        },
                        function () {
                            toggleLoadingIcon(filter, false);
                            vm.exam.course = undefined;
                            toast.error($translate.instant('sitnet_course_not_found') + ' ( ' + tmp + ' )');
                            return [];
                        }
                    );
                };

                vm.onCourseSelect = function ($item, $model, $label, exam) {
                    ExamRes.course.update({eid: exam.id, cid: $item.id}, function (course) {
                        toast.success($translate.instant('sitnet_exam_associated_with_course'));
                        vm.exam.course = course;
                        vm.onUpdate({course: course});
                    }, function () {
                        toast.error($translate.instant('sitnet_course_not_found'));
                    });
                    vm.exam.course = $item;
                };

                function toggleLoadingIcon(filter, isOn) {
                    if (filter && filter === 'code') {
                        vm.loadingCoursesByCode = isOn;
                    } else if (filter && filter === 'name') {
                        vm.loadingCoursesByName = isOn;
                    }
                }

                function setInputValue(filter, tmp) {
                    if (filter && filter === 'code') {
                        vm.exam.course = {code: tmp};
                    } else if (filter && filter === 'name') {
                        vm.exam.course = {name: tmp};
                    }
                }

            }]
    });

