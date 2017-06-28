'use strict';

angular.module('app.review')
    .component('rParticipation', {
        templateUrl: '/assets/app/review/assessment/general/participation.template.html',
        bindings: {
            participation: '<'
        },
        controller: ['examService',
            function (examService) {

                var vm = this;

                vm.viewAnswers = function () {
                    window.open('/exams/review/' + vm.participation.exam.id, '_blank');
                };

                vm.translateGrade = function () {
                    if (!vm.participation.exam.grade) {
                        return;
                    }
                    return examService.getExamGradeDisplayName(vm.participation.exam.grade.name);
                };

            }

        ]
    });
