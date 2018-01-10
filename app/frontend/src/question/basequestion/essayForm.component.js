/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

angular.module('app.question')
    .component('essayForm', {
        template: `
        <div class="col-md-12 margin-20 padl0 padr0">
            <ng-form name="essayForm">
                <div class="col-md-3 exam-basic-title padl0">
                    {{'sitnet_essay_length_recommendation' | translate}}
                </div>
                <div class="col-lg-5 col-md-7">
                    <div class="input-group" id="defaultExpectedWordCount">
                            <input name="defaultExpectedWordCount" type="number" class="form-control" ng-model="$ctrl.question.defaultExpectedWordCount"
                                ui-change="$ctrl.estimateCharacters()" min="1" max="1000000">
                        <span class="input-group-addon" title="{{'sitnet_average_word_length_finnish' | translate}}">
                            {{'sitnet_approximately' | translate}} {{$ctrl.estimateCharacters()}} {{'sitnet_characters' | translate}}
                        </span>
                    </div>
                    <div ng-show="essayForm.defaultExpectedWordCount.$invalid" class="warning-text-small margin-10">
                        <i class="fa fa-exclamation-circle reddish"></i>
                        {{'sitnet_essay_length_recommendation_bounds' | translate}}
                    </div>
                </div>
            </ng-form>
        </div>
        `,
        bindings: {
            question: '<',
        },
        controller: function () {

            const vm = this;

            vm.$onInit = function () {
                vm.question.defaultEvaluationType = vm.question.defaultEvaluationType || 'Points';
                if (vm.question.defaultEvaluationType === 'Selection') {
                    delete vm.question.defaultMaxScore; // will screw up validation otherwise
                }
            };

            vm.estimateCharacters = function () {
                return (vm.question.defaultExpectedWordCount || 0) * 8;
            };

        }
    });

