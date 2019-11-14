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

angular.module('app.review').component('printedSection', {
    template: `
            <blockquote><h4>{{$index + 1}}.&nbsp; &nbsp;{{$ctrl.section.name}}</h4></blockquote>
            <p>{{$ctrl.section.description}}</p>
            <div class="sub-content-row col-md-12" 
                ng-repeat="sectionQuestion in $ctrl.section.sectionQuestions | orderBy: 'sequenceNumber'">
                <printed-multi-choice ng-if="sectionQuestion.question.type === 'MultipleChoiceQuestion' ||
                            sectionQuestion.question.type === 'WeightedMultipleChoiceQuestion' ||
                            sectionQuestion.question.type === 'ClaimChoiceQuestion'"
                     section-question="sectionQuestion">
                </printed-multi-choice>
                <printed-essay ng-if="sectionQuestion.question.type === 'EssayQuestion'" 
                    section-question="sectionQuestion">
                </printed-essay>
                <printed-cloze-test ng-if="sectionQuestion.question.type === 'ClozeTestQuestion'" 
                    section-question="sectionQuestion">
                </printed-cloze-test>
            </div>
        `,
    bindings: {
        section: '<',
    },
});
