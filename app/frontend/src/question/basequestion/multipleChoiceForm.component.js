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

angular.module('app.question').component('multipleChoiceForm', {
    template: `
            <div class="col-md-12 mart20 marb10" ng-show="$ctrl.question.type == 'WeightedMultipleChoiceQuestion'">
                <div class="col-md-6 padl0">
                    <span class="question-option-title">{{'sitnet_option' | translate}}</span>
                    <br/><span>
                        <i ng-if="$ctrl.showWarning" class="fa fa-exclamation-circle reddish"></i>
                        <small ng-if="$ctrl.showWarning">{{'sitnet_shared_question_property_info' | translate}}</small>
                        </span>
                </div>
                <div class="col-md-2 question-option-title">
                    {{'sitnet_word_points' | translate | uppercase}}
                </div>
                <div class="col-md-4">
                </div>
            </div>
            <div class="col-md-12 mart20 marb10" ng-show="$ctrl.question.type == 'MultipleChoiceQuestion'">
                <div class="col-md-6 padl0">
                    <span class="question-option-title">{{'sitnet_option' | translate}}</span>
                    <br/><span>
                        <i ng-if="$ctrl.showWarning" class="fa fa-exclamation-circle reddish"></i>
                        <small ng-if="$ctrl.showWarning">{{'sitnet_shared_question_property_info' | translate}}</small>
                        </span>
                </div>
                <div class="col-md-2">
                    <div class="question-option-title make-inline">
                        {{'sitnet_multiplechoice_question_correct' | translate | uppercase}}
                    </div>
                </div>
                <div class="col-md-4">
                </div>
            </div>
            <div id="question-editor">
                <div class="row" ng-repeat="option in $ctrl.question.options">
                    <mc-option-form ng-if="$ctrl.question.type === 'MultipleChoiceQuestion'" 
                        option="option" question="$ctrl.question" 
                        allow-removal="!$ctrl.lotteryOn && $ctrl.allowOptionRemoval">
                    </mc-option-form>            
                    <wmc-option-form ng-if="$ctrl.question.type === 'WeightedMultipleChoiceQuestion'" 
                        option="option" question="$ctrl.question" lottery-on="$ctrl.lotteryOn"></wmc-option-form>
                </div>
                <div ng-show="$ctrl.question.type == 'WeightedMultipleChoiceQuestion'"
                     class="row">
                    <div class="col-md-6">&nbsp;</div>
                    <div class="col-md-2 question-option-title">{{'sitnet_max_score' | translate | uppercase}}:
                        {{$ctrl.calculateDefaultMaxPoints()}}
                    </div>
                </div>
                <div class="row mart20 padl30">
                    <a ng-click="$ctrl.addNewOption()" class="attachment-link pointer">
                        <i class="fa fa-plus"></i>
                        {{'sitnet_question_add_new_option'|translate}}
                    </a>
                </div>
            </div>
        `,
    bindings: {
        question: '<',
        showWarning: '<',
        lotteryOn: '<',
        allowOptionRemoval: '<',
    },
    controller: [
        '$translate',
        'Question',
        function($translate, Question) {
            const vm = this;

            vm.$onInit = function() {
                if (vm.question.type === 'WeightedMultipleChoiceQuestion') {
                    delete vm.question.defaultMaxScore;
                }
            };

            vm.addNewOption = function() {
                if (vm.lotteryOn) {
                    toast.error($translate.instant('sitnet_action_disabled_lottery_on'));
                    return;
                }
                vm.question.options.push({ correctOption: false });
            };

            vm.calculateDefaultMaxPoints = function() {
                return Question.calculateDefaultMaxPoints(vm.question);
            };
        },
    ],
});
