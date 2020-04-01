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

angular.module('app.question').component('claimChoiceForm', {
    template: `
            <div>
                <div class="col-md-9 col-md-offset-3">
                    <p>{{ 'sitnet_claim_choice_question_instruction' | translate }}</p>
                    <p>{{ 'sitnet_claim_choice_options_description' | translate }}</p>
                    <ul>
                        <li>{{ 'sitnet_claim_choice_correct_points_description' | translate }}</li>
                        <li>{{ 'sitnet_claim_choice_incorrect_points_description' | translate }}</li>
                        <li>{{ 'sitnet_claim_choice_skip_option_description' | translate }}</li>
                    </ul>
                    <br />
                    <span>
                    <i ng-if="$ctrl.showWarning" class="fa fa-exclamation-circle reddish"></i>
                    <small ng-if="$ctrl.showWarning">{{'sitnet_shared_question_property_info' | translate}}</small>
                    </span>
                </div>
                <div class="col-md-9 col-md-offset-3 margin-10 padl0 padr0 claim-choice-option-labels">
                    <div class="claim-choice-option-label">
                        <span class="question-option-title">{{'sitnet_question_options' | translate | uppercase}}</span>
                    </div>
                    <div class="claim-choice-option-label points">
                        <span class="question-option-title">
                            {{'sitnet_word_points' | translate | uppercase}}
                        </span>
                    </div>
                </div>
                <div class="col-md-9 col-md-offset-3 margin-10 padl0 padr0">
                    <div 
                        class="form-horizontal question-editor-claim-choice-option"
                        ng-class="$ctrl.returnOptionClass(opt)"
                        ng-repeat="opt in $ctrl.question.options"
                    >
                        <div class="claim-choice-option-inputs">
                            <input 
                                id="optionText" 
                                ng-model="opt.option" 
                                type="text" 
                                class="question-option-input"
                                required="true" 
                                ng-change="$ctrl.updateOptionTypes()"
                                ng-disabled="$ctrl.lotteryOn || opt.claimChoiceType === 'SkipOption'"
                            />
                            <input 
                                id="optionScore" 
                                name="maxScore" 
                                class="question-option-input points"
                                type="number" 
                                lang="en" 
                                fixed-precision
                                ng-model="opt.defaultScore"
                                required="true"
                                ng-change="$ctrl.updateOptionTypes()"
                                ng-disabled="$ctrl.lotteryOn || opt.claimChoiceType === 'SkipOption'"
                            />
                        </div>
                        <div 
                            class="claim-choice-option-description" 
                            ng-bind="$ctrl.returnOptionDescriptionTranslation(opt)"
                        ></div>
                    </div>
                </div>
                <div class="col-md-9 col-md-offset-3 claim-choice-warning-wrapper">
                    <div class="claim-choice-warning" ng-if="$ctrl.missingOptions.length > 0">
                        <i class="fa fa-exclamation-triangle" style="color:#ED4459;"></i>
                        <span style="color:#ED4459;">
                            {{ 'sitnet_claim_choice_missing_options_warning' | translate }}
                            <span ng-repeat="opt in $ctrl.missingOptions">
                                {{ opt | translate }}{{ $last ? '' : ',' }}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        `,
    bindings: {
        option: '<',
        question: '=',
        lotteryOn: '<',
    },
    controller: [
        '$translate',
        'Question',
        function($translate, Question) {
            const vm = this;

            vm.missingOptions = [];

            vm.$onInit = function() {
                const { state, question } = vm.question;
                if (state === 'NEW' && question === undefined) {
                    vm.resetOptions();
                }
            };

            vm.defaultOptions = {
                correct: {
                    option: $translate.instant('sitnet_claim_choice_default_correct'),
                    defaultScore: 1,
                    correctOption: true,
                    claimChoiceType: 'CorrectOption',
                },
                wrong: {
                    option: $translate.instant('sitnet_claim_choice_default_incorrect'),
                    defaultScore: -1,
                    correctOption: false,
                    claimChoiceType: 'IncorrectOption',
                },
                skip: {
                    option: $translate.instant('sitnet_question_claim_skip'),
                    defaultScore: 0,
                    correctOption: false,
                    claimChoiceType: 'SkipOption',
                },
            };

            vm.resetOptions = function() {
                const { correct, wrong, skip } = vm.defaultOptions;
                vm.question.options = [correct, wrong, skip];
            };

            vm.updateOptionTypes = function() {
                vm.question.options.forEach((opt, index) => {
                    if (opt.claimChoiceType === 'SkipOption') {
                        return opt;
                    }

                    if (opt.defaultScore === undefined) {
                        vm.question.options[index].correctOption = false;
                        vm.question.options[index].claimChoiceType = undefined;
                    }

                    if (opt.defaultScore <= 0) {
                        vm.question.options[index].correctOption = false;
                        vm.question.options[index].claimChoiceType = 'IncorrectOption';
                    } else if (opt.defaultScore > 0) {
                        vm.question.options[index].correctOption = true;
                        vm.question.options[index].claimChoiceType = 'CorrectOption';
                    }
                });
                vm.validate();
            };

            vm.returnOptionDescriptionTranslation = function(option) {
                return Question.returnOptionDescriptionTranslation(option.claimChoiceType);
            };

            vm.returnOptionClass = function(option) {
                return Question.returnClaimChoiceOptionClass(option.claimChoiceType);
            };

            vm.validate = function() {
                vm.missingOptions = Question.getInvalidClaimOptionTypes(vm.question.options)
                    .filter(type => type !== 'SkipOption')
                    .map(optionType => Question.getOptionTypeTranslation(optionType));
            };
        },
    ],
});
