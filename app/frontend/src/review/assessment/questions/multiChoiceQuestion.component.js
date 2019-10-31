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
import _ from 'lodash';
import toast from 'toastr';

angular.module('app.review').component('rMultiChoiceQuestion', {
    template: require('./multiChoiceQuestion.template.html'),
    bindings: {
        sectionQuestion: '<',
        onScore: '&',
    },
    require: {
        parentCtrl: '^^rExamSection',
    },
    controller: [
        '$sce',
        '$routeParams',
        '$translate',
        'Assessment',
        'Attachment',
        'Question',
        function($sce, $routeParams, $translate, Assessment, Attachment, Question) {
            const vm = this;

            vm.$onInit = function() {
                vm.participation = vm.parentCtrl.participation;
                vm.isScorable = vm.parentCtrl.isScorable;
            };

            vm.hasForcedScore = () => _.isNumber(vm.sectionQuestion.forcedScore);

            vm.scoreWeightedMultipleChoiceAnswer = function(ignoreForcedScore) {
                if (vm.sectionQuestion.question.type !== 'WeightedMultipleChoiceQuestion') {
                    return 0;
                }
                return Question.scoreWeightedMultipleChoiceAnswer(vm.sectionQuestion, ignoreForcedScore);
            };

            vm.scoreMultipleChoiceAnswer = function(ignoreForcedScore) {
                if (vm.sectionQuestion.question.type !== 'MultipleChoiceQuestion') {
                    return 0;
                }
                return Question.scoreMultipleChoiceAnswer(vm.sectionQuestion, ignoreForcedScore);
            };

            vm.scoreClaimChoiceAnswer = function(ignoreForcedScore) {
                if (vm.sectionQuestion.question.type !== 'ClaimChoiceQuestion') {
                    return 0;
                }
                return Question.scoreClaimChoiceAnswer(vm.sectionQuestion, ignoreForcedScore);
            };

            vm.displayMaxScore = () =>
                _.isInteger(vm.sectionQuestion.maxScore)
                    ? vm.sectionQuestion.maxScore
                    : vm.sectionQuestion.maxScore.toFixed(2);

            vm.calculateMaxPoints = function() {
                return Question.calculateMaxPoints(vm.sectionQuestion);
            };

            vm.displayQuestionText = function() {
                return $sce.trustAsHtml(vm.sectionQuestion.question.question);
            };

            vm.insertForcedScore = () => {
                Assessment.saveForcedScore(vm.sectionQuestion, $routeParams.id, $routeParams.ref, vm.participation._rev)
                    .then(resp => {
                        toast.info($translate.instant('sitnet_graded'));
                        vm.onScore({ revision: resp.data ? resp.data.rev : undefined });
                    })
                    .catch(err => toast.error(err.data));
            };

            vm.downloadQuestionAttachment = function() {
                if (vm.parentCtrl.collaborative) {
                    const attachment = vm.sectionQuestion.question.attachment;
                    return Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName);
                }
                return Attachment.downloadQuestionAttachment(vm.sectionQuestion.question);
            };
        },
    ],
});
