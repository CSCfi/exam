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
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import type { ReviewedExam } from '../../enrolment/enrolment.model';
import type { Exam, ExamParticipation, ExamSectionQuestion, Question } from '../../exam/exam.model';
import type { Examination } from '../../examination/examination.model';
import type { ReviewQuestion } from '../../review/review.model';
import { ConfirmationDialogService } from '../dialogs/confirmation-dialog.service';
import { FileService } from '../file/file.service';
import type { FileResult } from './dialogs/attachment-picker.component';
import { AttachmentSelectorComponent } from './dialogs/attachment-picker.component';

export interface AnsweredQuestion {
    id: number;
    essayAnswer: { objectVersion: number; attachment?: { fileName: string } };
}
@Injectable({ providedIn: 'root' })
export class AttachmentService {
    constructor(
        private dialogs: ConfirmationDialogService,
        private http: HttpClient,
        private modal: NgbModal,
        private translate: TranslateService,
        private toast: ToastrService,
        private Files: FileService,
    ) {}

    removeQuestionAttachment(question: Partial<Question>) {
        if (question.attachment) {
            question.attachment.removed = true;
        }
    }

    eraseQuestionAttachment = (question: Question) =>
        this.toPromise(this.http.delete<void>(this.questionAttachmentApi(question.id)));

    eraseCollaborativeQuestionAttachment(examId: number, questionId: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.http.delete(this.collaborativeQuestionAttachmentApi(examId, questionId)).subscribe({
                next: () => resolve(),
                error: (err) => reject(err),
            });
        });
    }

    removeQuestionAnswerAttachment(question: AnsweredQuestion) {
        this.removeAnswerAttachment(this.answerAttachmentApi(question.id), question);
    }

    removeExternalQuestionAnswerAttachment(question: AnsweredQuestion, hash: string) {
        this.removeAnswerAttachment(this.externalAnswerAttachmentApi(question.id, hash), question);
    }

    removeExamAttachment = (exam: Exam, collaborative = false) =>
        this.dialogs
            .open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure'))
            .subscribe({
                next: () => {
                    const api = collaborative ? this.collaborativeExamAttachmentApi : this.examAttachmentApi;
                    this.http.delete(api(exam.id)).subscribe({
                        next: () => {
                            this.toast.info(this.translate.instant('i18n_attachment_removed'));
                            delete exam.attachment;
                        },
                        error: (err) => this.toast.error(err),
                    });
                },
                error: (err) => this.toast.error(err),
            });

    removeFeedbackAttachment = (exam: Examination) =>
        this.dialogs
            .open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure'))
            .subscribe({
                next: () => {
                    this.http.delete(this.feedbackAttachmentApi(exam.id)).subscribe({
                        next: () => {
                            this.toast.info(this.translate.instant('i18n_attachment_removed'));
                            delete exam.examFeedback?.attachment;
                        },
                        error: (err) => this.toast.error(err),
                    });
                },
                error: (err) => this.toast.error(err),
            });

    removeCollaborativeExamFeedbackAttachment = (id: number, ref: string, participation: ExamParticipation) =>
        this.dialogs
            .open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure'))
            .subscribe({
                next: () => {
                    this.http
                        .delete<{ rev: string }>(`/app/iop/collab/attachment/exam/${id}/${ref}/feedback`)
                        .subscribe({
                            next: (resp) => {
                                this.toast.info(this.translate.instant('i18n_attachment_removed'));
                                participation._rev = resp.rev;
                                delete participation.exam.examFeedback?.attachment;
                            },
                            error: (resp) => this.toast.error(resp),
                        });
                },
                error: (err) => this.toast.error(err),
            });

    removeStatementAttachment = (exam: Exam) =>
        this.dialogs
            .open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure'))
            .subscribe({
                next: () => {
                    this.http.delete(this.statementAttachmentApi(exam.id)).subscribe({
                        next: () => {
                            this.toast.info(this.translate.instant('i18n_attachment_removed'));
                            delete exam.languageInspection?.statement.attachment;
                        },
                        error: (err) => this.toast.error(err),
                    });
                },
                error: (err) => this.toast.error(err),
            });

    downloadExternalQuestionAttachment(exam: Exam, sq: ExamSectionQuestion) {
        if (sq.question.attachment) {
            this.Files.download(
                `/app/iop/attachment/exam/${exam.hash}/question/${sq.id}`,
                sq.question.attachment.fileName,
            );
        }
    }

    downloadQuestionAttachment(question: Partial<Question>) {
        if (question.attachment && question.attachment.id) {
            this.Files.download('/app/attachment/question/' + question.id, question.attachment.fileName);
        }
    }

    downloadCollaborativeQuestionAttachment(examId: number, sq: ExamSectionQuestion) {
        if (sq.question.attachment && sq.question.attachment.externalId) {
            this.Files.download(
                `/app/iop/collab/attachment/exam/${examId}/question/${sq.id}`,
                sq.question.attachment.fileName,
            );
        }
    }

    downloadQuestionAnswerAttachment(question: AnsweredQuestion | ReviewQuestion) {
        if (question.essayAnswer.attachment) {
            this.Files.download(
                `/app/attachment/question/${question.id}/answer`,
                question.essayAnswer.attachment.fileName,
            );
        }
    }

    downloadCollaborativeAttachment(id: string, fileName: string) {
        this.Files.download(`/app/iop/collab/attachment/${id}`, fileName);
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

    downloadFeedbackAttachment(exam: Exam | ReviewedExam) {
        if (exam.examFeedback?.attachment) {
            this.Files.download('/app/attachment/exam/' + exam.id + '/feedback', exam.examFeedback.attachment.fileName);
        }
    }

    downloadStatementAttachment(exam: Exam | ReviewedExam) {
        if (!exam.languageInspection?.statement.attachment) {
            return;
        }
        this.Files.download(
            '/app/attachment/exam/' + exam.id + '/statement',
            exam.languageInspection.statement.attachment.fileName,
        );
    }

    getFileSize(size: number): string {
        return Math.round(size / 1000) + ' kB';
    }

    selectFile(isTeacherModal: boolean, params?: unknown, title = 'i18n_attachment_selection'): Promise<FileResult> {
        const modalRef = this.modal.open(AttachmentSelectorComponent, {
            backdrop: 'static',
            keyboard: false,
        });
        Object.assign(modalRef.componentInstance, params);
        modalRef.componentInstance.isTeacherModal = isTeacherModal;
        modalRef.componentInstance.title = title;
        return modalRef.result;
    }

    private toPromise = (observable: Observable<void>) =>
        new Promise<void>((resolve, reject) => {
            observable.subscribe({
                next: () => resolve(),
                error: (err) => reject(err),
            });
        });

    private removeAnswerAttachment = (url: string, question: AnsweredQuestion) =>
        this.dialogs
            .open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure'))
            .subscribe({
                next: () => {
                    this.http.delete<{ objectVersion?: number }>(url, {}).subscribe({
                        next: (resp) => {
                            this.toast.info(this.translate.instant('i18n_attachment_removed'));
                            question.essayAnswer.objectVersion = resp?.objectVersion ? resp.objectVersion : 0;
                            delete question.essayAnswer.attachment;
                        },
                        error: (err) => this.toast.error(err),
                    });
                },
                error: (err) => this.toast.error(err),
            });

    private questionAttachmentApi = (id: number) => `/app/attachment/question/${id}`;
    private collaborativeQuestionAttachmentApi = (eid: number, qid: number) =>
        `/app/iop/collab/attachment/exam/${eid}/question/${qid}`;
    private answerAttachmentApi = (qid: number) => `/app/attachment/question/${qid}/answer`;
    private externalAnswerAttachmentApi = (qid: number, hash: string) =>
        `/app/iop/attachment/question/${qid}/answer/${hash}`;
    private examAttachmentApi = (id: number) => `/app/attachment/exam/${id}`;
    private collaborativeExamAttachmentApi = (id: number) => `/app/iop/collab/attachment/exam/${id}`;
    private feedbackAttachmentApi = (id: number) => `/app/attachment/exam/${id}/feedback`;
    private statementAttachmentApi = (id: number) => `/app/attachment/exam/${id}/statement`;

    private getResource(url: string, external = false, collaborative = false) {
        return external
            ? url.replace('/app/', '/app/iop/')
            : collaborative
              ? url.replace('/app/', '/app/iop/collab/')
              : url;
    }
}
