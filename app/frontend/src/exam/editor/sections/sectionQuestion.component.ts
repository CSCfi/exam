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
import { IDeferred } from 'angular';
import * as toast from 'toastr';

import { IModalService } from 'angular-ui-bootstrap';

import { ExamSection, ExamSectionQuestion, Question } from '../../exam.model';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { FileService } from '../../../utility/file/file.service';

export const SectionQuestionComponent: ng.IComponentOptions = {
    template: require('./sectionQuestion.template.html'),
    bindings: {
        sectionQuestion: '<',
        lotteryOn: '<',
        onDelete: '&',
        onUpdate: '&',
    },
    require: {
        parentCtrl: '^^section',
    },
    controller: class SectionQuestionComponentController implements ng.IComponentController {
        sectionQuestion: ExamSectionQuestion;
        lotteryOn: boolean;
        onDelete: (_: { sectionQuestion: ExamSectionQuestion }) => any;
        onUpdate: () => any;
        parentCtrl: { collaborative: boolean; section: ExamSection; examId: number };

        constructor(
            private $http: ng.IHttpService,
            private $sce: ng.ISCEService,
            private $q: ng.IQService,
            private $uibModal: IModalService,
            private $translate: ng.translate.ITranslateService,
            private dialogs: angular.dialogservice.IDialogService,
            private Question: any,
            private Attachment: AttachmentService,
            private Files: FileService,
        ) {
            'ngInject';
        }

        calculateMaxPoints = () => this.Question.calculateMaxPoints(this.sectionQuestion);

        getCorrectClaimChoiceOptionScore = () => this.Question.getCorrectClaimChoiceOptionScore(this.sectionQuestion);

        sanitizeQuestion = () => this.$sce.trustAsHtml(this.sectionQuestion.question.question);

        editQuestion = () => this.openExamQuestionEditor();

        downloadQuestionAttachment = () => {
            if (this.parentCtrl.collaborative) {
                this.Attachment.downloadCollaborativeQuestionAttachment(this.parentCtrl.examId, this.sectionQuestion);
            }
            this.Attachment.downloadQuestionAttachment(this.sectionQuestion.question);
        };

        removeQuestion = () =>
            this.dialogs
                .confirm(this.$translate.instant('sitnet_confirm'), this.$translate.instant('sitnet_remove_question'))
                .result.then(() => this.onDelete({ sectionQuestion: this.sectionQuestion }));

        getQuestionDistribution(): ng.IPromise<{ distributed: boolean }> {
            if (this.parentCtrl.collaborative) {
                return this.$q.when({ distributed: false });
            }
            const deferred: IDeferred<{ distributed: boolean }> = this.$q.defer();
            this.$http
                .get(`/app/exams/question/${this.sectionQuestion.id}/distribution`)
                .then((resp: ng.IHttpResponse<{ distributed: boolean }>) => {
                    deferred.resolve({ distributed: resp.data.distributed });
                })
                .catch(resp => {
                    toast.error(resp.data);
                    deferred.reject();
                });
            return deferred.promise;
        }

        private openExamQuestionEditor = () => {
            this.getQuestionDistribution().then((data: { distributed: boolean }) => {
                if (!data.distributed) {
                    // If this is not distributed, treat it as a plain question (or at least trick the user to
                    // believe so)
                    this.openBaseQuestionEditor();
                } else {
                    this.openDistributedQuestionEditor();
                }
            });
        };

        private getResource = (url: string) =>
            this.parentCtrl.collaborative ? url.replace('/app/exams/', '/integration/iop/exams/') : url;

        private openBaseQuestionEditor = () => {
            this.$uibModal
                .open({
                    component: 'baseQuestionEditor',
                    backdrop: 'static',
                    keyboard: true,
                    windowClass: 'question-editor-modal',
                    resolve: {
                        lotteryOn: this.lotteryOn,
                        questionDraft: ng.extend(this.sectionQuestion.question, { examSectionQuestions: [] }),
                        collaborative: this.parentCtrl.collaborative,
                        examId: this.parentCtrl.examId,
                        sectionQuestion: this.sectionQuestion,
                        questionId: this.sectionQuestion.question.id,
                    },
                })
                .result.then((data: { question: Question }) => {
                    const resource =
                        `/app/exams/${this.parentCtrl.examId}/sections/` +
                        `${this.parentCtrl.section.id}/questions/${this.sectionQuestion.id}`;
                    this.$http
                        .put(this.getResource(resource), { question: data.question })
                        .then((resp: ng.IHttpResponse<ExamSectionQuestion>) => {
                            ng.extend(this.sectionQuestion, resp.data);
                            // Collaborative exam question handling.
                            if (!this.parentCtrl.collaborative) {
                                return;
                            }
                            const attachment = data.question.attachment;
                            if (!attachment) {
                                return;
                            }
                            if (attachment.modified && attachment.file) {
                                this.Files.upload(
                                    '/integration/iop/attachment/question',
                                    attachment.file,
                                    { examId: this.parentCtrl.examId, questionId: this.sectionQuestion.id },
                                    data.question,
                                    () => this.onUpdate(),
                                );
                            } else if (attachment.removed) {
                                this.Attachment.eraseCollaborativeQuestionAttachment(
                                    this.parentCtrl.examId,
                                    this.sectionQuestion.id,
                                ).then(() => {
                                    delete this.sectionQuestion.question.attachment;
                                    this.onUpdate();
                                });
                            }
                        })
                        .catch(resp => {
                            toast.error(resp.data);
                            if (this.parentCtrl.collaborative) {
                                this.onUpdate();
                            }
                        });
                });
        };

        private openDistributedQuestionEditor = () => {
            this.$uibModal
                .open({
                    component: 'examQuestionEditor',
                    backdrop: 'static',
                    keyboard: true,
                    windowClass: 'question-editor-modal',
                    resolve: {
                        examQuestion: ng.copy(this.sectionQuestion),
                        lotteryOn: this.lotteryOn,
                    },
                })
                .result.then(data => {
                    this.Question.updateDistributedExamQuestion(
                        data.question,
                        data.examQuestion,
                        this.parentCtrl.examId,
                        this.parentCtrl.section.id,
                    ).then((esq: ExamSectionQuestion) => {
                        toast.info(this.$translate.instant('sitnet_question_saved'));
                        // apply changes back to scope
                        ng.extend(this.sectionQuestion, esq);
                    });
                });
        };
    },
};

ng.module('app.exam.editor').component('sectionQuestion', SectionQuestionComponent);
