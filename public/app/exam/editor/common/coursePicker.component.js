'use strict';
angular.module('app.exam.editor')
    .component('coursePicker', {
        templateUrl: '/assets/app/exam/editor/common/coursePicker.template.html',
        bindings: {
            exam: '<',
            onUpdate: '&'
        },
        controller: ['$http', '$translate', 'Course', 'ExamRes', 'toast',
            function ($http, $translate, Course, ExamRes, toast) {

                var vm = this;

                vm.getCourses = function (filter, criteria) {
                    toggleLoadingIcon(filter, true);
                    var tmp = criteria;
                    if (vm.exam && vm.exam.course && vm.exam.course.id) {
                        var course = vm.exam.course;
                        vm.exam.course = undefined;
                        setInputValue(filter, tmp);

                        ExamRes.course.delete({eid: vm.exam.id, cid: course.id}, function (updated_exam) {
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

