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
import * as toast from 'toastr';
import { Exam, ExamSectionQuestion, Question } from '../../exam/exam.model';
import { FileService } from '../file/file.service';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from '../../../node_modules/rxjs';
import { ConfirmationDialogService } from '../../exam/editor/common/confirmationDialog.service';
import { AttachmentSelectorComponent, FileResult } from './dialogs/attachmentSelector.component';

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
    essayAnswer: { objectVersion: number, attachment: { fileName: string } };
}
@Injectable()
export class AttachmentService {

    constructor(
        private dialogs: ConfirmationDialogService,
        private http: HttpClient,
        private modal: NgbModal,
        private translate: TranslateService,
        private Files: FileService,
    ) { }

    private questionAttachmentApi = (id) => `/app/attachment/question/${id}`;
    private collaborativeQuestionAttachmentApi = (eid, qid) =>
        `/integration/iop/attachment/exam/${eid}/question/${qid}`
    private answerAttachmentApi = (qid) => `/app/attachment/question/${qid}/answer`;
    private externalAnswerAttachmentApi = (qid, hash) => `/app/iop/attachment/question/${qid}/answer/${hash}`;
    private examAttachmentApi = (id) => `/app/attachment/exam/${id}`;
    private collaborativeExamAttachmentApi = (id) => `/integration/iop/attachment/exam/${id}`;
    private feedbackAttachmentApi = (id) => `/app/attachment/exam/${id}/feedback`;
    private statementAttachmentApi = (id) => `/app/attachment/exam/${id}/statement`;

    private getResource(url, external = false, collaborative = false) {
        return external ? url.replace('/app/', '/app/iop/') :
            collaborative ? url.replace('/app/', '/integration/iop/') : url;
    }

    removeQuestionAttachment(question: { attachment: { removed: boolean } }) {
        question.attachment.removed = true;
    }

    private toPromise = (observable: Observable<any>) =>
        new Promise((resolve, reject) => {
            observable.subscribe(() => resolve(), err => reject(err));
        })

    eraseQuestionAttachment = (question: { id: number }) =>
        this.toPromise(this.http.delete(this.questionAttachmentApi(question.id)))

    eraseCollaborativeQuestionAttachment(examId: number, questionId: number): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.delete(this.collaborativeQuestionAttachmentApi(examId, questionId)).subscribe(
                () => resolve(), err => reject(err)
            );
        });
    }

    removeQuestionAnswerAttachment(question: AnsweredQuestion) {
        this.removeAnswerAttachment(this.answerAttachmentApi(question.id), question);
    }

    removeExternalQuestionAnswerAttachment(question: AnsweredQuestion, hash: string) {
        this.removeAnswerAttachment(this.externalAnswerAttachmentApi(question.id, hash), question, hash);
    }

    private removeAnswerAttachment(url: string, question: AnsweredQuestion,
        hash?: string) {
        const dialog = this.dialogs.open(this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_are_you_sure'));
        dialog.result.then(() => {
            this.http.delete<{ objectVersion: number }>(url, {}).subscribe(resp => {
                toast.info(this.translate.instant('sitnet_attachment_removed'));
                question.essayAnswer.objectVersion = resp.objectVersion;
                delete question.essayAnswer.attachment;
            }, err => toast.error(err));
        });
    }

    removeExamAttachment(exam: Exam, collaborative = false) {
        const dialog = this.dialogs.open(this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_are_you_sure'));
        dialog.result.then(() => {
            let api = collaborative ? this.collaborativeExamAttachmentApi : this.examAttachmentApi;
            this.http.delete(api(exam.id)).subscribe(() => {
                toast.info(this.translate.instant('sitnet_attachment_removed'));
                delete exam.attachment;
            }, err => toast.error(err));
        });
    }

    removeFeedbackAttachment(exam: ExamWithFeedback) {
        const dialog = this.dialogs.open(this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_are_you_sure'));
        dialog.result.then(() => {
            this.http.delete(this.feedbackAttachmentApi(exam.id)).subscribe(() => {
                toast.info(this.translate.instant('sitnet_attachment_removed'));
                exam.examFeedback.attachment = null;
            }, err => toast.error(err));
        });
    }

    removeStatementAttachment(exam: ExamWithStatement) {
        const dialog = this.dialogs.open(this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_are_you_sure'));
        dialog.result.then(() => {
            this.http.delete(this.statementAttachmentApi(exam.id)).subscribe(() => {
                toast.info(this.translate.instant('sitnet_attachment_removed'));
                delete exam.languageInspection.statement.attachment;
            }, err => toast.error(err));
        });
    }

    downloadExternalQuestionAttachment(exam: Exam, sq: ExamSectionQuestion) {
        if (sq.question.attachment.id) {
            this.Files.download(`/app/iop/attachment/exam/${exam.id}/question/${sq.id}`,
                sq.question.attachment.fileName);
        }
    }

    downloadQuestionAttachment(question: Question) {
        if (question.attachment.id) {
            this.Files.download('/app/attachment/question/' + question.id, question.attachment.fileName);
        }
    }

    downloadCollaborativeQuestionAttachment(examId: Number, sq: ExamSectionQuestion) {
        if (sq.question.attachment.externalId) {
            this.Files.download(`/integration/iop/attachment/exam/${examId}/question/${sq.id}`,
                sq.question.attachment.fileName);
        }
    }

    downloadQuestionAnswerAttachment(question: AnsweredQuestion) {
        this.Files.download(`/app/attachment/question/${question.id}/answer`,
            question.essayAnswer.attachment.fileName);
    }

    downloadCollaborativeAttachment(id: string, fileName: string) {
        this.Files.download(`/integration/iop/attachment/${id}`, fileName);
    }

    downloadExamAttachment(exam: Exam, collaborative = false) {
        if (!exam.attachment) {
            return;
        }
        this.Files.download(this.getResource(`/app/attachment/exam/${exam.external ? exam.hash : exam.id}`,
            exam.external, collaborative),
            exam.attachment.fileName);
    }

    downloadFeedbackAttachment(exam: ExamWithFeedback) {
        this.Files.download('/app/attachment/exam/' + exam.id + '/feedback', exam.examFeedback.attachment.fileName);
    }

    downloadStatementAttachment(exam: ExamWithStatement) {
        this.Files.download('/app/attachment/exam/' + exam.id + '/statement',
            exam.languageInspection.statement.attachment.fileName);
    }

    getFileSize(size: number): string {
        return Math.round(size / 1000) + ' kB';
    }

    selectFile(isTeacherModal, params): Promise<FileResult> {
        const modalRef = this.modal.open(AttachmentSelectorComponent, {
            backdrop: 'static',
            keyboard: false
        });
        Object.assign(modalRef.componentInstance, params);
        modalRef.componentInstance.isTeacherModal = isTeacherModal;
        return modalRef.result;
    }

}
