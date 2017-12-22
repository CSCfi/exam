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
