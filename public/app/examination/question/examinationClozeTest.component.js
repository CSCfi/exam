'use strict';

angular.module('app.examination')
    .component('examinationClozeTest', {
        templateUrl: '/assets/app/examination/question/examinationClozeTest.template.html',
        bindings: {
            sq: '<',
            examHash: '<'
        },
        controller: ['Examination',
            function (Examination) {

                var vm = this;

                vm.saveAnswer = function () {
                    Examination.saveTextualAnswer(vm.sq, vm.examHash, false);
                };

            }
        ]
    });
