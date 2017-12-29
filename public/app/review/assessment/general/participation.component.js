'use strict';

angular.module('app.review')
    .component('rParticipation', {
        templateUrl: '/assets/app/review/assessment/general/participation.template.html',
        bindings: {
            participation: '<'
        },
        controller: ['Exam',
            function (Exam) {

                var vm = this;

                vm.viewAnswers = function () {
                    window.open('/assessments/' + vm.participation.exam.id, '_blank');
                };

                vm.translateGrade = function () {
                    if (vm.participation.noShow ||!vm.participation.exam.grade) {
                        return;
                    }
                    return Exam.getExamGradeDisplayName(vm.participation.exam.grade.name);
                };

            }

        ]
    });
