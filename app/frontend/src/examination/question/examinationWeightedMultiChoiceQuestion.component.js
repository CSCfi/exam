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

angular.module('app.examination').component('examinationWeightedMultiChoiceQuestion', {
    template:
        '<div class="bottom-padding-2">' +
        '    <fieldset>' +
        '        <legend style="visibility: hidden;">answer options for multiple choice question</legend>' +
        '        <div ng-repeat="sqo in $ctrl.sq.options" class="exam-answer-options">' +
        '            <input type="checkbox" aria-label="option" name="selectedOption"' +
        '                ng-checked="sqo.answered" ng-model="sqo.answered"' +
        '                ng-change="$ctrl.saveOption()"/>' +
        '            {{sqo.option.option}}' +
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
        orderOptions: '<',
    },
    controller: [
        'Examination',
        function(Examination) {
            const vm = this;

            vm.$onInit = function() {
                if (vm.orderOptions) {
                    vm.sq.options.sort((a, b) => a.id - b.id);
                }
            };

            vm.saveOption = function() {
                Examination.saveOption(vm.examHash, vm.sq, vm.isPreview);
            };
        },
    ],
});