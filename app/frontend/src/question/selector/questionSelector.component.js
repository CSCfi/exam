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
import toast from 'toastr';

angular.module('app.question').component('questionSelector', {
    template: require('./questionSelector.template.html'),
    bindings: {
        close: '&',
        dismiss: '&',
        resolve: '<',
    },
    controller: [
        '$translate',
        'ExamRes',
        function($translate, ExamRes) {
            const vm = this;

            vm.$onInit = function() {
                vm.questions = [];
            };

            vm.resultsUpdated = function(results) {
                vm.questions = results;
            };

            vm.questionSelected = function(selections) {
                vm.selections = selections;
            };

            vm.questionCopied = function(copy) {
                toast.info($translate.instant('sitnet_question_copied'));
            };

            vm.addQuestions = function() {
                // check that at least one has been selected
                if (vm.selections.length === 0) {
                    toast.warning($translate.instant('sitnet_choose_atleast_one'));
                    return;
                }

                const insertQuestion = function(sectionId, to, examId) {
                    ExamRes.sectionquestionsmultiple.insert(
                        {
                            eid: examId,
                            sid: sectionId,
                            sequenceNumber: to,
                            questions: vm.selections.join(),
                        },
                        function(section) {
                            const insertedSectionQuestions = section.sectionQuestions.filter(esq =>
                                vm.selections.includes(esq.question.id),
                            );
                            toast.info($translate.instant('sitnet_question_added'));
                            vm.close({ $value: insertedSectionQuestions });
                        },
                        function(error) {
                            toast.error(error.data);
                            vm.cancel();
                        },
                    );
                };

                // calculate the new order number for question sequence
                // always add question to last spot, because dragndrop
                // is not in use here
                const to = parseInt(vm.resolve.questionCount) + 1;
                insertQuestion(vm.resolve.sectionId, to, vm.resolve.examId);
            };

            vm.cancel = function() {
                vm.dismiss({ $value: 'cancel' });
            };
        },
    ],
});
