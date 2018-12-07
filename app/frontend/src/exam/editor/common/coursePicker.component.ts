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

import * as angular from 'angular';
import * as toast from 'toastr';

angular.module('app.exam.editor')
    .component('coursePicker', {
        template: require('./coursePicker.template.html'),
        bindings: {
            course: '<',
            onUpdate: '&'
        },
        controller: ['$translate', 'Course',
            function ($translate, Course) {

                const vm = this;

                vm.$onInit = function () {
                    vm.filter = {
                        name: vm.course ? vm.course.name : '',
                        code: vm.course ? vm.course.code : ''
                    };
                };

                vm.getCourses = (filter: string, criteria: string) => {
                    toggleLoadingIcon(filter, true);
                    setInputValue(filter, criteria);
                    return Course.courseApi.query({ filter: filter, q: criteria }).$promise.then(
                        function (courses) {
                            toggleLoadingIcon(filter, false);
                            if (courses.length === 0) {
                                toast.error($translate.instant('sitnet_course_not_found') + ' ( ' + criteria + ' )');
                            }
                            return courses;
                        },
                        function () {
                            toggleLoadingIcon(filter, false);
                            toast.error($translate.instant('sitnet_course_not_found') + ' ( ' + criteria + ' )');
                            return [];
                        }
                    );
                };

                vm.onCourseSelect = function (selection) {
                    vm.filter = { name: selection.name, code: selection.code };
                    vm.onUpdate({ course: selection });
                };

                function toggleLoadingIcon(filter, isOn) {
                    if (filter && filter === 'code') {
                        vm.loadingCoursesByCode = isOn;
                    } else if (filter && filter === 'name') {
                        vm.loadingCoursesByName = isOn;
                    }
                }

                function setInputValue(filter, value) {
                    if (filter === 'code') {
                        vm.filter = { code: value };
                    } else if (filter === 'name') {
                        vm.filter = { name: value };
                    }
                }

            }]
    });

