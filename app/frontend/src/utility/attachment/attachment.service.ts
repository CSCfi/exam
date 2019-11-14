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
import * as ng from 'angular';
import * as uib from 'angular-ui-bootstrap';
import * as toast from 'toastr';

import { Exam, ExamSectionQuestion, Question } from '../../exam/exam.model';
import { ReviewQuestion } from '../../review/review.model';
import { FileService } from '../file/file.service';

/// <reference types="angular-dialog-service" />

interface ExamWithFeedback {
    id: number;
    examFeedback: { attachment: any };
}

interface ExamWithStatement {
    id: number;
    languageInspection: { statement: { attachment: any } };
}

interface AnsweredQuestion {
    id: number;
    essayAnswer: { objectVersion: number; attachment: { fileName: string } };
}

export class AttachmentService {
    private questionAttachmentApi: ng.resource.IResourceClass<any>;
    private collaborativeQuestionAttachmentApi: ng.resource.IResourceClass<any>;
    private answerAttachmentApi: ng.resource.IResourceClass<any>;
    private externalAnswerAttachmentApi: ng.resource.IResourceClass<any>;
    private examAttachmentApi: ng.resource.IResourceClass<any>;
    private collaborativeExamAttachmentApi: ng.resource.IResourceClass<any>;
    private feedbackAttachmentApi: ng.resource.IResourceClass<any>;
    private statementAttachmentApi: ng.resource.IResourceClass<any>;

    constructor(
        private $resource: ng.resource.IResourceService,
        private $uibModal: uib.IModalService,
        private dialogs: angular.dialogservice.IDialogService,
        private $translate: ng.translate.ITranslateService,
        private Files: FileService,
    ) {
        'ngInject';

        this.questionAttachmentApi = this.$resource(
            '/app/attachment/question/:id',
            {
                id: '@id',
            },
            {
                remove: { method: 'DELETE', params: { id: '@id' } },
            },
        );
        this.collaborativeQuestionAttachmentApi = this.$resource(
            '/integration/iop/attachment/exam/:eid/question/:qid',
            {
                eid: '@eid',
                qid: '@qid',
            },
            {
                remove: { method: 'DELETE', params: { id: '@id' } },
            },
        );
        this.answerAttachmentApi = this.$resource(
            '/app/attachment/question/:qid/answer',
            {
                qid: '@qid',
            },
            {
                remove: { method: 'DELETE', params: { qid: '@qid' } },
            },
        );
        this.externalAnswerAttachmentApi = this.$resource(
            '/app/iop/attachment/question/:qid/answer/:hash',
            {
                qid: '@qid',
                hash: '@hash',
            },
            {
                remove: { method: 'DELETE', params: { qid: '@qid', hash: '@hash' } },
            },
        );
        this.examAttachmentApi = this.$resource(
            '/app/attachment/exam/:id',
            {
                id: '@id',
            },
            {
                remove: { method: 'DELETE', params: { id: '@id' } },
            },
        );
        this.collaborativeExamAttachmentApi = this.$resource(
            '/integration/iop/attachment/exam/:id ',
            {
                id: '@id',
            },
            {
                remove: { method: 'DELETE', params: { id: '@id' } },
            },
        );
        this.feedbackAttachmentApi = this.$resource(
            '/app/attachment/exam/:id/feedback',
            {
                id: '@id',
            },
            {
                remove: { method: 'DELETE', params: { eid: '@id' } },
            },
        );
        this.statementAttachmentApi = this.$resource(
            '/app/attachment/exam/:id/statement',
            {
                id: '@id',
            },
            {
                remove: { method: 'DELETE', params: { eid: '@id' } },
            },
        );
    }

    private getResource(url, external = false, collaborative = false) {
        return external
            ? url.replace('/app/', '/app/iop/')
            : collaborative
            ? url.replace('/app/', '/integration/iop/')
            : url;
    }

    removeQuestionAttachment(question: { attachment: { removed: boolean } }) {
        question.attachment.removed = true;
    }

    eraseQuestionAttachment(question: { id: number }): ng.IPromise<any> {
        return this.questionAttachmentApi.remove({ id: question.id }).$promise;
    }

    eraseCollaborativeQuestionAttachment(examId: number, questionId: number): ng.IPromise<any> {
        return this.collaborativeQuestionAttachmentApi.remove({ eid: examId, qid: questionId }).$promise;
    }

    removeQuestionAnswerAttachment(question: AnsweredQuestion) {
        this.removeAnswerAttachment(this.answerAttachmentApi, question);
    }

    removeExternalQuestionAnswerAttachment(question: AnsweredQuestion, hash: string) {
        this.removeAnswerAttachment(this.externalAnswerAttachmentApi, question, hash);
    }

    private removeAnswerAttachment(
        resource: ng.resource.IResourceClass<any>,
        question: AnsweredQuestion,
        hash?: string,
    ) {
        const dialog = this.dialogs.confirm(
            this.$translate.instant('sitnet_confirm'),
            this.$translate.instant('sitnet_are_you_sure'),
        );
        dialog.result.then(() => {
            resource.remove(
                { qid: question.id, hash: hash },
                (answer: { objectVersion: number }) => {
                    toast.info(this.$translate.instant('sitnet_attachment_removed'));
                    question.essayAnswer.objectVersion = answer.objectVersion;
                    delete question.essayAnswer.attachment;
                },
                (error: { data: any }) => {
                    toast.error(error.data);
                },
            );
        });
    }

    removeExamAttachment(exam: Exam, collaborative = false) {
        const dialog = this.dialogs.confirm(
            this.$translate.instant('sitnet_confirm'),
            this.$translate.instant('sitnet_are_you_sure'),
        );
        dialog.result.then(() => {
            const api = collaborative ? this.collaborativeExamAttachmentApi : this.examAttachmentApi;
            api.remove(
                { id: exam.id },
                () => {
                    toast.info(this.$translate.instant('sitnet_attachment_removed'));
                    delete exam.attachment;
                },
                error => {
                    toast.error(error.data);
                },
            );
        });
    }

    removeFeedbackAttachment(exam: ExamWithFeedback) {
        const dialog = this.dialogs.confirm(
            this.$translate.instant('sitnet_confirm'),
            this.$translate.instant('sitnet_are_you_sure'),
        );
        dialog.result.then(() => {
            this.feedbackAttachmentApi.remove(
                { id: exam.id },
                () => {
                    toast.info(this.$translate.instant('sitnet_attachment_removed'));
                    exam.examFeedback.attachment = null;
                },
                error => {
                    toast.error(error.data);
                },
            );
        });
    }

    removeStatementAttachment(exam: ExamWithStatement) {
        const dialog = this.dialogs.confirm(
            this.$translate.instant('sitnet_confirm'),
            this.$translate.instant('sitnet_are_you_sure'),
        );
        dialog.result.then(() => {
            this.statementAttachmentApi.remove(
                { id: exam.id },
                () => {
                    toast.info(this.$translate.instant('sitnet_attachment_removed'));
                    delete exam.languageInspection.statement.attachment;
                },
                error => {
                    toast.error(error.data);
                },
            );
        });
    }

    downloadExternalQuestionAttachment(exam: Exam, sq: ExamSectionQuestion) {
        if (sq.question.attachment.id) {
            this.Files.download(
                `/app/iop/attachment/exam/${exam.hash}/question/${sq.id}`,
                sq.question.attachment.fileName,
            );
        }
    }

    downloadQuestionAttachment(question: Question) {
        if (question.attachment.id) {
            this.Files.download('/app/attachment/question/' + question.id, question.attachment.fileName);
        }
    }

    downloadCollaborativeQuestionAttachment(examId: number, sq: ExamSectionQuestion) {
        if (sq.question.attachment.externalId) {
            this.Files.download(
                `/integration/iop/attachment/exam/${examId}/question/${sq.id}`,
                sq.question.attachment.fileName,
            );
        }
    }

    downloadQuestionAnswerAttachment(question: AnsweredQuestion | ReviewQuestion) {
        this.Files.download(`/app/attachment/question/${question.id}/answer`, question.essayAnswer.attachment.fileName);
    }

    downloadCollaborativeAttachment(id: string, fileName: string) {
        this.Files.download(`/integration/iop/attachment/${id}`, fileName);
    }

    downloadExamAttachment(exam: Exam, collaborative = false) {
        if (!exam.attachment) {
            return;
        }
        this.Files.download(
            this.getResource(
                `/app/attachment/exam/${exam.external ? exam.hash : exam.id}`,
                exam.external,
                collaborative,
            ),
            exam.attachment.fileName,
        );
    }

    downloadFeedbackAttachment(exam: ExamWithFeedback) {
        this.Files.download('/app/attachment/exam/' + exam.id + '/feedback', exam.examFeedback.attachment.fileName);
    }

    downloadStatementAttachment(exam: ExamWithStatement) {
        this.Files.download(
            '/app/attachment/exam/' + exam.id + '/statement',
            exam.languageInspection.statement.attachment.fileName,
        );
    }

    getFileSize(size: number): string {
        return Math.round(size / 1000) + ' kB';
    }

    selectFile(isTeacherModal, resolve) {
        const resolution = angular.extend({}, resolve);
        resolution.isTeacherModal = isTeacherModal;
        return this.$uibModal.open({
            backdrop: 'static',
            keyboard: true,
            animation: true,
            component: 'attachmentSelector',
            resolve: resolution,
        }).result;
    }
}
