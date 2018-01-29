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

angular.module('app.exam.editor')
    .component('section', {
        template: require('./section.template.html'),
        bindings: {
            section: '<',
            examId: '<',
            onDelete: '&',
            onReloadRequired: '&' // TODO: try to live without this callback?
        },
        controller: ['$translate', '$uibModal', 'dialogs', 'ExamRes', 'Question',
            function ($translate, $modal, dialogs, ExamRes, Question) {

                const vm = this;

                vm.clearAllQuestions = function () {
                    const dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_all_questions'));
                    dialog.result.then(function () {
                        ExamRes.clearsection.clear({eid: vm.examId, sid: vm.section.id}, function () {
                            vm.section.sectionQuestions.splice(0, vm.section.sectionQuestions.length);
                            vm.section.lotteryOn = false;
                            toast.info($translate.instant('sitnet_all_questions_removed'));
                        }, function (error) {
                            toast.error(error.data);
                        });
                    });
                };

                vm.removeSection = function () {
                    const dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_section'));
                    dialog.result.then(function () {
                        vm.onDelete({section: vm.section});
                    });
                };

                vm.renameSection = function () {
                    ExamRes.sections.update({eid: vm.examId, sid: vm.section.id}, getSectionPayload(vm.section),
                        function (sec) {
                            //vm.section = sec;
                            toast.info($translate.instant('sitnet_section_updated'));
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                vm.toggleLottery = function () {
                    if (vm.toggleDisabled()) {
                        vm.section.lotteryOn = false;
                        return;
                    }

                    if (!questionPointsMatch()) {
                        toast.error($translate.instant('sitnet_error_lottery_points_not_match'));
                        vm.section.lotteryOn = false;
                        return;
                    }

                    ExamRes.sections.update({eid: vm.examId, sid: vm.section.id}, getSectionPayload(vm.section),
                        function (sec) {
                            //vm.section = sec;
                            if (angular.isUndefined(vm.section.lotteryItemCount)) {
                                vm.section.lotteryItemCount = 1;
                            }
                            toast.info($translate.instant('sitnet_section_updated'));
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                vm.toggleDisabled = function () {
                    return !vm.section.sectionQuestions || vm.section.sectionQuestions.length < 2;
                };

                vm.updateLotteryCount = function () {
                    if (!vm.section.lotteryItemCount) {
                        toast.warning($translate.instant('sitnet_warn_lottery_count'));
                        vm.section.lotteryItemCount = 1;
                    }
                    else {
                        ExamRes.sections.update({eid: vm.examId, sid: vm.section.id}, getSectionPayload(vm.section),
                            function (sec) {
                                //vm.section = sec;
                                toast.info($translate.instant('sitnet_section_updated'));
                            }, function (error) {
                                toast.error(error.data);
                            });
                    }
                };

                vm.expandSection = function () {
                    ExamRes.sections.update({eid: vm.examId, sid: vm.section.id}, getSectionPayload(vm.section));
                };

                vm.moveQuestion = function (from, to) {
                    if (from >= 0 && to >= 0 && from !== to) {
                        ExamRes.questionOrder.update({
                            eid: vm.examId,
                            sid: vm.section.id,
                            from: from,
                            to: to
                        }, function () {
                            toast.info($translate.instant('sitnet_questions_reordered'));
                        });
                    }
                };

                vm.addNewQuestion = function () {
                    if (vm.section.lotteryOn) {
                        toast.error($translate.instant('sitnet_error_drop_disabled_lottery_on'));
                        return;
                    }
                    openBaseQuestionEditor();
                };

                vm.removeQuestion = function (sectionQuestion) {
                    ExamRes.questions.remove({
                        eid: vm.examId,
                        sid: vm.section.id,
                        qid: sectionQuestion.question.id
                    }, function () {
                        // CHECK THE SPLICING
                        vm.section.sectionQuestions.splice(vm.section.sectionQuestions.indexOf(sectionQuestion), 1);
                        toast.info($translate.instant('sitnet_question_removed'));
                        if (vm.section.sectionQuestions.length < 2 && vm.section.lotteryOn) {
                            // turn off lottery
                            vm.section.lotteryOn = false;
                            vm.section.lotteryItemCount = 1;
                            ExamRes.sections.update({
                                eid: vm.examId,
                                sid: vm.section.id
                            }, getSectionPayload(vm.section));
                        }
                    }, function (error) {
                        toast.error(error.data);
                    });
                };


                vm.openLibrary = function () {

                    if (vm.section.lotteryOn) {
                        toast.error($translate.instant('sitnet_error_drop_disabled_lottery_on'));
                        return;
                    }
                    $modal.open({
                        component: 'questionSelector',
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        resolve: {
                            examId: vm.examId,
                            sectionId: vm.section.id,
                            questionCount: vm.section.sectionQuestions.length
                        }
                    }).result.then(function (data) {
                        // TODO: see if we could live without reloading the whole exam from back?
                        vm.onReloadRequired();
                    });

                };


                function questionPointsMatch() {
                    if (!vm.section.sectionQuestions) {
                        return true;
                    }
                    const sectionQuestions = vm.section.sectionQuestions;
                    if (sectionQuestions.length < 1) {
                        return true;
                    }
                    const score = getQuestionScore(sectionQuestions[0]);
                    return sectionQuestions.every(function (sectionQuestion) {
                        return score === getQuestionScore(sectionQuestion);
                    });
                }

                function getQuestionScore(question) {
                    const evaluationType = question.evaluationType;
                    const type = question.question.type;
                    if (evaluationType === 'Points' || type === 'MultipleChoiceQuestion' || type === 'ClozeTestQuestion') {
                        return question.maxScore;
                    }
                    if (type === 'WeightedMultipleChoiceQuestion') {
                        return Question.calculateMaxPoints(question);
                    }
                    return null;
                }

                const getSectionPayload = function (section) {
                    return {
                        id: section.id,
                        name: section.name,
                        lotteryOn: section.lotteryOn,
                        lotteryItemCount: section.lotteryItemCount,
                        description: section.description,
                        expanded: section.expanded
                    };
                };

                const insertExamQuestion = function (examId, sectionId, questionId, sequenceNumber) {
                    ExamRes.sectionquestions.insert({
                            eid: examId,
                            sid: sectionId,
                            seq: sequenceNumber,
                            qid: questionId
                        }, function () {
                            vm.onReloadRequired(); // TODO: see if we could live without reloading the whole exam from back?
                        }, function (error) {
                            toast.error(error.data);
                        }
                    );
                };


                const openBaseQuestionEditor = function () {

                    $modal.open({
                        component: 'baseQuestionEditor',
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        resolve: {newQuestion: true}
                    }).result.then(function (data) {
                        // Now that new base question was created we make an exam section question out of it
                        insertExamQuestion(vm.examId, vm.section.id, data.question.id, vm.section.sectionQuestions.length);
                    });
                };


            }]
    });
