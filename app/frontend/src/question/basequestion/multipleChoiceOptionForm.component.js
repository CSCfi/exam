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
    .component('mcOptionForm', {
        template: `
        <div class="form-horizontal question-editor-option mart10">
            <div class="col-md-12">
                <div class="col-md-6 question-option-empty"
                    ng-class="{'question-correct-option':$ctrl.option.correctOption}">
                    <input type="text" focus-on="opt{{$ctrl.option.id}}" class="make-inline question-option-input radiobut"
                           ng-model="$ctrl.option.option" required="true"/>
                </div>
                <div class="col-md-2 question-option-empty-radio" 
                        ng-class="{'question-correct-option-radio':$ctrl.option.correctOption}">
                    <input name="correctOption" type="radio" ng-model="$ctrl.option.correctOption" ng-value="true" 
                        ng-click="$ctrl.correctAnswerToggled()"
                           ng-disabled="$ctrl.option.correctOption == true" class="make-inline question-option-radio">
                </div>
        
                <div ng-show="$ctrl.allowRemoval" ng-click="$ctrl.removeOption()" class="col-md-1 question-option-trash">
                    <i class="fa fa-trash-o fa-fw" title="{{'sitnet_remove' | translate}}"></i>
                </div>
                <div class="col-md-3">
                </div>
            </div>
        </div>
        `,
        bindings: {
            option: '<',
            question: '<',
            allowRemoval: '<' // !lotteryOn && !inPublishedExam
        },
        controller: ['Question', function (Question) {

            const vm = this;

            vm.correctAnswerToggled = function () {
                Question.toggleCorrectOption(vm.option, vm.question.options);
            };

            vm.removeOption = function () {
                const hasCorrectAnswer = vm.question.options.some(o => o.id !== vm.option.id && o.correctOption);
                if (hasCorrectAnswer) {
                    vm.question.options.splice(vm.question.options.indexOf(vm.option.id), 1);
                } else {
                    toast.error($translate.instant('sitnet_action_disabled_minimum_options'));
                }
            };

        }]
    });

