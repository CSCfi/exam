'use strict';

angular.module('app.exam.editor')
    .component('newExam', {
        templateUrl: '/assets/app/exam/editor/newExam.template.html',
        controller: ['examService',
            function (examService) {

                var vm = this;

                vm.$onInit = function  () {
                    examService.listExecutionTypes().then(function (types) {
                        vm.executionTypes = types;
                    });
                };

                vm.createExam = function () {
                    if (vm.type) {
                        examService.createExam(vm.type.type);
                    }
                }
            }
        ]
    });
