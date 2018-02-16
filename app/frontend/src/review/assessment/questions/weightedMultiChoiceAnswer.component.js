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

angular.module('app.review')
    .component('rWeightedMultiChoiceAnswer', {
        template: `
           <div class="padl15 marb10" ng-show="$ctrl.sectionQuestion.reviewExpanded"
                ng-repeat="option in $ctrl.sectionQuestion.options | orderBy:'id'">
                <div ng-if="option.answered">
                    <div ng-if="option.score >= 0" class="exam-answered-correct">
                        <div class="make-inline pull-left">
                            <img src="Images/icon_correct_answer_checkbox_green.png" alt="exam"
                                 onerror="this.onerror=null;this.src='Images/icon_correct_answer_checkbox_green.svg'" />
                        </div>
                        <div class="make-inline middle-column">
                            <span class="exam-question-option-text" mathjax ng-bind-html="option.option.option"></span>
                        </div>
                        <div class="make-inline pull-right">
                            <span class="text-success">
                            {{option.score}} {{'sitnet_unit_points' | translate }}</span>
                        </div>
                    </div>
                    <div ng-if="option.score < 0" class="exam-answered-wrong">
                        <div class="make-inline pull-left">
                            <img src="Images/icon_wrong_answer_checkbox_red.png" alt="exam"
                                 onerror="this.onerror=null;this.src='Images/icon_wrong_answer_checkbox_red.svg'" />
                        </div>
                        <div class="make-inline middle-column">
                            <span class="exam-question-option-text" mathjax ng-bind-html="option.option.option"></span>
                        </div>
                        <div class="make-inline pull-right">
                            <span class="text-danger">
                            {{option.score}} {{'sitnet_unit_points' | translate }}</span>
                        </div>
                    </div>
                </div>
                <div ng-if="!option.answered">
                    <div class="exam-not-answered">
                        <div class="make-inline pull-left">
                            <img ng-if="option.score >= 0" src="Images/icon_correct_answer_checkbox_green.png" alt="exam"
                                 onerror="this.onerror=null;this.src='Images/icon_correct_answer_checkbox_green.svg'" />
                            <img ng-if="option.score < 0" src="Images/icon_wrong_answer_checkbox.png" alt="exam"
                                 onerror="this.onerror=null;this.src='Images/icon_wrong_answer_checkbox.svg'" />
                        </div>
                        <div class="make-inline middle-column">
                            <span class="exam-question-option-text" mathjax ng-bind-html="option.option.option"></span>
                        </div>
                        <div class="make-inline pull-right">
                            <span ng-class="option.score >= 0 ? 'text-success' : 'text-danger'">
                            {{option.score}} {{'sitnet_unit_points' | translate }}</span>
                        </div>
                    </div>
                </div>
            </div>
        `,
        bindings: {
            sectionQuestion: '<'
        }
    });
