'use strict';

angular.module('app.exam.editor')
    .component('newExam', {
        templateUrl: '/assets/app/exam/editor/creation/newExam.template.html',
        controller: ['Exam',
            function (Exam) {

                var vm = this;

                vm.$onInit = function  () {
                    Exam.listExecutionTypes().then(function (types) {
                        vm.executionTypes = types;
                    });
                };

                vm.createExam = function () {
                    if (vm.type) {
                        Exam.createExam(vm.type.type);
                    }
                }
            }
        ]
    });
