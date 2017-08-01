'use strict';

angular.module('app.examination')
    .component('examinationMultiChoiceQuestion', {
        template: '' +
        '<div class="bottom-padding-2">' +
        '    <div ng-repeat="sqo in $ctrl.sq.options | orderBy: \'id\'" class="exam-answer-options">' +
        '        <input type="radio" ng-model="$ctrl.sq.selectedOption" ng-value="sqo.id"' +
        '            ng-click="$ctrl.saveOption()"/>' +
        '        {{sqo.option.option}}' +
        '    </div>' +
        '</div>' +
        '<div class="padl0 question-type-text">' +
        '    {{$ctrl.sq.derivedMaxScore}} {{\'sitnet_unit_points\' | translate}}' +
        '</div>',
        bindings: {
            sq: '<',
            examHash: '<',
            isPreview: '<'
        },
        controller: ['Examination',
            function (Examination) {

                var vm = this;

                vm.$onInit = function () {
                    var answered = vm.sq.options.filter(function (o) {
                        return o.answered;
                    });
                    if (answered.length > 1) {
                        console.warn('several answered options for mcq');
                    }
                    if (answered.length === 1) {
                        vm.sq.selectedOption = answered[0].id;
                    }
                };

                vm.saveOption = function () {
                    Examination.saveOption(vm.examHash, vm.sq, vm.isPreview);
                };

            }
        ]
    });
