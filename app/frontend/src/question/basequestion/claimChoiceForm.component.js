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
                <div class="col-md-9 col-md-offset-3 mart10 marb0"">
                    <div class="col-md-8 padl0">
                        <span class="question-option-title">{{'sitnet_claim' | translate}}</span>
                        <br/><span>
                            <i ng-if="$ctrl.showWarning" class="fa fa-exclamation-circle reddish"></i>
                            <small ng-if="$ctrl.showWarning">{{'sitnet_shared_question_property_info' | translate}}</small>
                            </span>
                    </div>
                    <div class="col-md-4 padl20">
                        <div class="question-option-title make-inline">
                            {{'sitnet_word_points' | translate | uppercase}}
                        </div>
                    </div>
                </div>
                <div class="col-md-12 margin-10 padl0 padr0">
                    <div class="col-md-3 exam-basic-title padl0">
                        {{'sitnet_question_claim_correct' | translate}}
                    </div>
                    <div class="col-md-9 form-horizontal question-editor-option">
                        <div class="col-md-8">
                            <input id="optionText" ng-model="$ctrl.question.options[0].option" type="text" class="question-option-input claim"
                            required="true"/>
                        </div>
                        <div class="col-md-4">
                            <input id="optionScore" name="maxScore" class="question-option-input points"
                            type="number" lang="en" 
                            fixed-precision
                            ng-model="$ctrl.question.options[0].defaultScore"
                            required="true"
                            ng-disabled="$ctrl.lotteryOn"/>
                        </div>
                    </div>
                </div>
                <div class="col-md-12 margin-10 padl0 padr0">
                    <div class="col-md-3 exam-basic-title padl0">
                        {{'sitnet_question_claim_wrong' | translate}}
                    </div>
                    <div class="col-md-9 form-horizontal question-editor-option">
                        <div class="col-md-8">
                            <input id="optionText" ng-model="$ctrl.question.options[1].option" type="text" class="question-option-input claim"
                            required="true"/>
                        </div>
                        <div class="col-md-4">
                            <input id="optionScore" name="maxScore" class="question-option-input points"
                            type="number" lang="en" 
                            fixed-precision
                            ng-model="$ctrl.question.options[1].defaultScore"
                            required="true"
                            ng-disabled="$ctrl.lotteryOn"/>
                        </div>
                    </div>
                </div>
                <div class="col-md-12 margin-10 padl0 padr0">
                    <div class="col-md-3 exam-basic-title padl0">
                        {{'sitnet_question_claim_skip' | translate}}
                    </div>
                    <div class="col-md-9 form-horizontal question-editor-option">
                        <div class="col-md-8">
                            <input id="optionText" ng-model="$ctrl.question.options[2].option" type="text" class="question-option-input claim"
                            required="true"/>
                        </div>
                        <div class="col-md-4">
                            <input id="optionScore" name="maxScore" class="question-option-input points"
                            type="number" lang="en" 
                            fixed-precision
                            ng-model="$ctrl.question.options[2].defaultScore"
                            required="true"
                            ng-disabled="$ctrl.lotteryOn"/>
                        </div>
                    </div>
                </div>
            </div>
        `,
    bindings: {
        option: '<',
        question: '<',
        lotteryOn: '<',
    },
    controller: [
        '$translate',
        'Question',
        function($translate, Question) {
            const vm = this;

            vm.$onInit = function() {
                const { state, question } = vm.question;
                if (state === 'NEW' && question === undefined) {
                    vm.resetOptions();
                }
            };

            vm.defaultAnswers = {
                correct: { option: '', defaultScore: 1, correctOption: true, claimChoiceType: 'CorrectOption' },
                wrong: { option: '', defaultScore: -1, correctOption: false, claimChoiceType: 'IncorrectOption' },
                skip: { option: '', defaultScore: 0, correctOption: false, claimChoiceType: 'SkipOption' },
            };

            vm.resetOptions = function() {
                const { correct, wrong, skip } = vm.defaultAnswers;
                vm.question.options = [correct, wrong, skip];
            };
        },
    ],
});
