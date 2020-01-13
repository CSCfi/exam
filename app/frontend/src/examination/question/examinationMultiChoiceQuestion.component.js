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

angular.module('app.examination').component('examinationMultiChoiceQuestion', {
    template:
        '<div class="bottom-padding-2">' +
        '    <fieldset>' +
        '        <legend style="visibility: hidden;">answer options for multiple choice question</legend>' +
        '        <div ng-repeat="sqo in $ctrl.sq.options | orderBy: \'id\'" class="exam-answer-options">' +
        '            <input aria-label="option" type="radio" ng-model="$ctrl.sq.selectedOption" ng-value="sqo.id"' +
        '                ng-change="$ctrl.saveOption()"/>' +
        '           {{sqo.option.option}}' +
        '        </div>' +
        '    </fieldset>' +
        '</div>' +
        '<div class="padl0 question-type-text">' +
        "    {{$ctrl.sq.derivedMaxScore}} {{'sitnet_unit_points' | translate}}" +
        '</div>',
    bindings: {
        sq: '<',
        examHash: '<',
        isPreview: '<',
        isCollaborative: '<'
    },
    controller: [
        'Examination',
        function(Examination) {
            const vm = this;

            vm.$onInit = function() {
                if(vm.isCollaborative && vm.isPreview) {
                    // Collaborative exam options have no id in preview, using id from nested option node
                    vm.sq.options = vm.sq.options.map(opt => ({ ...opt, id: opt.option.id}));
                }

                const answered = vm.sq.options.filter(function(o) {
                    return o.answered;
                });
                if (answered.length > 1) {
                    console.warn('several answered options for mcq');
                }
                if (answered.length === 1) {
                    vm.sq.selectedOption = answered[0].id;
                }
            };

            vm.saveOption = function() {
                Examination.saveOption(vm.examHash, vm.sq, vm.isPreview);
            };
        },
    ],
});
