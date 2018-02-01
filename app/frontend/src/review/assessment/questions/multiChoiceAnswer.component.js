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
    .component('rMultiChoiceAnswer', {
        template: `
            <div class="padl15 marb10" ng-show="$ctrl.sectionQuestion.reviewExpanded"
                 ng-repeat="option in $ctrl.sectionQuestion.options | orderBy:'id'">
                <div ng-if="option.answered">
                    <div ng-if="option.option.correctOption" class="exam-answered-correct">
                        <div class="make-inline pull-left">
                            <img ng-show="option.answered" src="Images/icon_correct_answer_radio.png" alt="exam"
                                 onerror="this.onerror=null;this.src='Images/icon_correct_answer_radio.png'" />
                        </div>
                        <div class="make-inline middle-column">
                            <span class="exam-question-option-text" mathjax ng-bind-html="option.option.option"></span>
                        </div>
                    </div>
                    <div ng-if="!option.option.correctOption" class="exam-answered-wrong">
                        <div class="make-inline pull-left">
                            <img ng-show="option.answered" src="Images/icon_wrong_answer_radio.png" alt="exam"
                                 onerror="this.onerror=null;this.src='Images/icon_wrong_answer_radio.svg'" />
                        </div>
                        <div class="make-inline middle-column">
                            <span class="exam-question-option-text" mathjax ng-bind-html="option.option.option"></span>
                        </div>
                    </div>
                </div>
                <div ng-if="!option.answered">
                    <div class="exam-not-answered">
                        <div class="make-inline pull-left">
                            <img ng-if="option.option.correctOption" src="Images/icon_correct_answer_radio.png" alt="exam"
                                 onerror="this.onerror=null;this.src='Images/icon_correct_answer_radio.svg'" />
                            <img ng-if="!option.option.correctOption" src="Images/icon_wrong_answer.png" alt="exam"
                                 onerror="this.onerror=null;this.src='Images/icon_wrong_answer.svg'" />
                        </div>
                        <div class="make-inline middle-column">
                            <span class="exam-question-option-text" mathjax ng-bind-html="option.option.option"></span>
                        </div>
                    </div>
                </div>
            </div>
        `,
        bindings: {
            sectionQuestion: '<'
        }
    });
