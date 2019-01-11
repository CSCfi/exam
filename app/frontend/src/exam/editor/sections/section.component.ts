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
/// <reference types="angular-dialog-service" />

import * as ng from 'angular';
import * as toast from 'toastr';
import { ExamSection, ExamSectionQuestion, Question, ExamMaterial } from '../../exam.model';
import { IModalService } from 'angular-ui-bootstrap';
import { IHttpResponse } from 'angular';
import { FileService } from '../../../utility/file/file.service';

export const SectionComponent: ng.IComponentOptions = {
    template: require('./section.template.html'),
    bindings: {
        section: '<',
        examId: '<',
        materials: '<',
        onDelete: '&',
        onReloadRequired: '&', // TODO: try to live without this callback?
        onMaterialsChanged: '&'
    },
    require: {
        parentCtrl: '^^sections'
    },
    controller: class SectionComponentController implements ng.IComponentController {

        section: ExamSection;
        examId: number;
        onDelete: (_: { section: ExamSection }) => any;
        onReloadRequired: () => any;
        onMaterialsChanged: () => any;
        parentCtrl: { collaborative: boolean };
        collaborative: boolean;
        materials: ExamMaterial[];

        constructor(
            private $http: ng.IHttpService,
            private $translate: ng.translate.ITranslateService,
            private $uibModal: IModalService,
            private dialogs: angular.dialogservice.IDialogService,
            private Question: any,
            private Files: FileService
        ) {
            'ngInject';
        }

        $onInit = () => this.collaborative = this.parentCtrl.collaborative;

        private getResource = (url: string) => this.parentCtrl.collaborative ?
            url.replace('/app/exams/', '/integration/iop/exams/') : url

        private getSectionPayload = () => ({
            id: this.section.id,
            name: this.section.name,
            lotteryOn: this.section.lotteryOn,
            lotteryItemCount: this.section.lotteryItemCount,
            description: this.section.description,
            expanded: this.section.expanded,
            optional: this.section.optional
        })

        private getQuestionScore = (question: ExamSectionQuestion) => {
            const evaluationType = question.evaluationType;
            const type = question.question.type;
            if (evaluationType === 'Points' || type === 'MultipleChoiceQuestion' || type === 'ClozeTestQuestion') {
                return question.maxScore;
            }
            if (type === 'WeightedMultipleChoiceQuestion') {
                return this.Question.calculateMaxPoints(question);
            }
            return null;
        }

        private questionPointsMatch = () => {
            const sectionQuestions = this.section.sectionQuestions;
            if (!sectionQuestions || sectionQuestions.length < 2) {
                return true;
            }
            const score = this.getQuestionScore(sectionQuestions[0]);
            return sectionQuestions.every(sq => score === this.getQuestionScore(sq));
        }

        private updateSection = (silent: boolean) => {
            this.$http.put(this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}`),
                this.getSectionPayload())
                .then(() => {
                    if (!silent) {
                        toast.info(this.$translate.instant('sitnet_section_updated'));
                    }
                })
                .catch(resp => toast.error(resp.data));
        }

        private insertExamQuestion = (question: Question, seq: number) => {
            // TODO: see if we could live without reloading the whole exam from back?
            const resource = this.parentCtrl.collaborative ?
                `/integration/iop/exams/${this.examId}/sections/${this.section.id}/questions` :
                `/app/exams/${this.examId}/sections/${this.section.id}/questions/${question.id}`;

            this.$http.post(resource, { sequenceNumber: seq, question: question })
                .then((resp: IHttpResponse<ExamSectionQuestion>) => {
                    // Collaborative exam question handling.
                    this.addAttachment(resp.data, question, this.onReloadRequired);
                }).catch(resp => toast.error(resp.data));
        }

        private addAttachment = (data: ExamSectionQuestion, question: Question, callback: () => void) => {
            if (!this.parentCtrl.collaborative) {
                callback();
                return;
            }
            const attachment = question.attachment;
            if (!attachment) {
                callback();
                return;
            }
            if (attachment.modified && attachment.file) {
                this.Files.upload('/integration/iop/attachment/question', attachment.file,
                    { examId: this.examId, questionId: data.id },
                    question, callback);
            }
        }

        private openBaseQuestionEditor = () =>

            this.$uibModal.open({
                component: 'baseQuestionEditor',
                backdrop: 'static',
                keyboard: true,
                windowClass: 'question-editor-modal',
                resolve: { newQuestion: true, collaborative: this.collaborative }
            }).result.then((data: { question: Question }) => {
                // Now that new base question was created we make an exam section question out of it
                this.insertExamQuestion(
                    data.question,
                    this.section.sectionQuestions.length
                );
            })

        clearAllQuestions = () => {
            const dialog = this.dialogs.confirm(this.$translate.instant('sitnet_confirm'),
                this.$translate.instant('sitnet_remove_all_questions'));
            dialog.result.then(() => {
                this.$http.delete(this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}/questions`))
                    .then(() => {
                        this.section.sectionQuestions.splice(0, this.section.sectionQuestions.length);
                        this.section.lotteryOn = false;
                        toast.info(this.$translate.instant('sitnet_all_questions_removed'));
                    }).catch(resp => toast.error(resp.data));
            });
        }

        removeSection = () => {
            const dialog = this.dialogs.confirm(this.$translate.instant('sitnet_confirm'),
                this.$translate.instant('sitnet_remove_section'));
            dialog.result.then(() => this.onDelete({ section: this.section }));
        }

        renameSection = () => this.updateSection(false);
        expandSection = () => this.updateSection(true);

        toggleDisabled = () => !this.section.sectionQuestions || this.section.sectionQuestions.length < 2;

        materialsChanged = () => this.onMaterialsChanged();

        toggleLottery = () => {
            if (this.toggleDisabled()) {
                this.section.lotteryOn = false;
                return;
            }

            if (!this.questionPointsMatch()) {
                toast.error(this.$translate.instant('sitnet_error_lottery_points_not_match'));
                this.section.lotteryOn = false;
                return;
            }
            this.$http.put(this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}`),
                this.getSectionPayload())
                .then(() => {
                    if (ng.isUndefined(this.section.lotteryItemCount)) {
                        this.section.lotteryItemCount = 1;
                    }
                    toast.info(this.$translate.instant('sitnet_section_updated'));
                })
                .catch(resp => toast.error(resp.data));
        }

        updateLotteryCount = () => {
            if (!this.section.lotteryItemCount) {
                toast.warning(this.$translate.instant('sitnet_warn_lottery_count'));
                this.section.lotteryItemCount = 1;
            } else {
                this.updateSection(false);
            }
        }

        moveQuestion = (from: number, to: number) => {
            if (from >= 0 && to >= 0 && from !== to) {
                this.$http.put(
                    this.getResource(`/app/exams/${this.examId}/sections/${this.section.id}/reorder`),
                    { from: from, to: to })
                    .then(() => toast.info(this.$translate.instant('sitnet_questions_reordered'))
                    );
            }
        }

        addNewQuestion = () => {
            if (this.section.lotteryOn) {
                toast.error(this.$translate.instant('sitnet_error_drop_disabled_lottery_on'));
                return;
            }
            this.openBaseQuestionEditor();
        }

        removeQuestion = (sq: ExamSectionQuestion) => {
            this.$http.delete(this.getResource(
                `/app/exams/${this.examId}/sections/${this.section.id}/questions/${sq.question.id}`
            )).then(() => {
                this.section.sectionQuestions.splice(this.section.sectionQuestions.indexOf(sq), 1);
                toast.info(this.$translate.instant('sitnet_question_removed'));
                if (this.section.sectionQuestions.length < 2 && this.section.lotteryOn) {
                    // turn off lottery
                    this.section.lotteryOn = false;
                    this.section.lotteryItemCount = 1;
                    this.updateSection(true);
                }
            }).catch(resp => toast.error(resp.data));
        }

        openLibrary = () => {
            if (this.section.lotteryOn) {
                toast.error(this.$translate.instant('sitnet_error_drop_disabled_lottery_on'));
                return;
            }
            this.$uibModal.open({
                component: 'questionSelector',
                backdrop: 'static',
                keyboard: true,
                windowClass: 'question-editor-modal',
                resolve: {
                    examId: this.examId,
                    sectionId: this.section.id,
                    questionCount: this.section.sectionQuestions.length
                }
            }).result.then(() => {
                // TODO: see if we could live without reloading the whole exam from back?
                this.onReloadRequired();
            });
        }

    }
};

angular.module('app.exam.editor').component('section', SectionComponent);
