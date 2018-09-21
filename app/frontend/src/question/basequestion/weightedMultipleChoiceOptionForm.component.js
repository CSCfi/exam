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
import toast from 'toastr';

angular.module('app.question')
    .component('wmcOptionForm', {
        template: `
            <div class="col-md-12 form-horizontal question-editor-option">
                <div class="col-md-6 question-option-empty" ng-class="$ctrl.option.defaultScore > 0 ? 'question-correct-option' : ''">
                    <input id="optionText" type="text" focus-on="opt{{$ctrl.option.id}}" class="question-option-input"
                       ng-model="$ctrl.option.option"
                       required="true"/>
                </div>
                <div class="col-md-2 question-option-empty-radio" ng-class="$ctrl.option.defaultScore > 0 ? 'question-correct-option-radio' : ''">
                    <input id="optionScore" name="maxScore" class="question-option-input points"
                       type="number" step="1"
                       ng-model="$ctrl.option.defaultScore"
                       fixed-precision
                       required="true"
                       ng-disabled="$ctrl.lotteryOn"/>
                </div>
                <div class="col-md-1 question-option-trash pointer" ng-hide="$ctrl.lotteryOn" ng-click="$ctrl.removeOption()">
                    <i class="fa fa-trash-o fa-fw" title="{{'sitnet_remove' | translate}}"></i>
                </div>
                <div class="col-md-3"></div>
            </div>
        `,
        bindings: {
            option: '<',
            question: '<',
            lotteryOn: '<'
        },
        controller: ['$translate', function ($translate) {

            const vm = this;

            vm.removeOption = function () {
                const hasCorrectAnswer = vm.question.options.some(o => o.id !== vm.option.id && o.defaultScore > 0);
                if (hasCorrectAnswer) {
                    vm.question.options.splice(vm.question.options.indexOf(vm.option.id), 1);
                } else {
                    toast.error($translate.instant('sitnet_action_disabled_minimum_options'));
                }
            };

        }]
    });
