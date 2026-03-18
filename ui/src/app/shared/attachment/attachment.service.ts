// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { catchError, EMPTY, map, Observable, switchMap, tap } from 'rxjs';
import type { ExamParticipation, ReviewedExam } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';
import type { Examination } from 'src/app/examination/examination.model';
import { ExamSectionQuestion, Question } from 'src/app/question/question.model';
import type { ReviewQuestion } from 'src/app/review/review.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FileService } from 'src/app/shared/file/file.service';
import { AnsweredQuestion, FileResult } from './attachment.model';
import { AttachmentSelectorComponent } from './dialogs/attachment-picker.component';

@Injectable({ providedIn: 'root' })
export class AttachmentService {
    private readonly dialogs = inject(ConfirmationDialogService);
    private readonly http = inject(HttpClient);
    private readonly modal = inject(ModalService);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Files = inject(FileService);

    eraseQuestionAttachment$ = (question: Question) => this.http.delete<void>(this.questionAttachmentApi(question.id));

    eraseCollaborativeQuestionAttachment$ = (examId: number, questionId: number) =>
        this.http.delete(this.collaborativeQuestionAttachmentApi(examId, questionId));

    removeQuestionAnswerAttachment(question: AnsweredQuestion): Observable<void> {
        return this.removeAnswerAttachment$(this.answerAttachmentApi(question.id), question);
    }

    removeExternalQuestionAnswerAttachment(question: AnsweredQuestion, hash: string): Observable<void> {
        return this.removeAnswerAttachment$(this.externalAnswerAttachmentApi(question.id, hash), question);
    }

    removeExamAttachment$ = (exam: Exam, collaborative = false): Observable<void> => {
        const api = collaborative ? this.collaborativeExamAttachmentApi : this.examAttachmentApi;
        return new Observable((observer) => {
            this.dialogs
                .open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure'))
                .subscribe({
                    next: () => {
                        this.http.delete(api(exam.id)).subscribe({
                            next: () => {
                                this.toast.info(this.translate.instant('i18n_attachment_removed'));
                                observer.next();
                                observer.complete();
                            },
                            error: (err) => {
                                this.toast.error(err);
                                observer.error(err);
                            },
                        });
                    },
                    error: (err) => this.toast.error(err),
                });
        });
    };

    removeFeedbackAttachment = (exam: Examination): Observable<void> =>
        this.dialogs.open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure')).pipe(
            switchMap(() => this.http.delete(this.feedbackAttachmentApi(exam.id))),
            tap(() => {
                this.toast.info(this.translate.instant('i18n_attachment_removed'));
                delete exam.examFeedback?.attachment;
            }),
            map(() => void 0),
            catchError((err) => {
                this.toast.error(err);
                return EMPTY;
            }),
        );

    removeCollaborativeExamFeedbackAttachment = (
        id: number,
        ref: string,
        participation: ExamParticipation,
    ): Observable<void> =>
        this.dialogs.open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure')).pipe(
            switchMap(() => this.http.delete<{ rev: string }>(`/app/iop/collab/attachment/exam/${id}/${ref}/feedback`)),
            tap((resp) => {
                this.toast.info(this.translate.instant('i18n_attachment_removed'));
                participation._rev = resp.rev;
                delete participation.exam.examFeedback?.attachment;
            }),
            map(() => void 0),
            catchError((err) => {
                this.toast.error(err);
                return EMPTY;
            }),
        );

    removeStatementAttachment = (exam: Exam): Observable<void> =>
        this.dialogs
            .open$(
                this.translate.instant('i18n_confirm'),
                this.translate.instant('i18n_confirm_remove_attachment'),
                this.translate.instant('i18n_remove'),
                this.translate.instant('i18n_button_cancel'),
            )
            .pipe(
                switchMap(() => this.http.delete(this.statementAttachmentApi(exam.id))),
                tap(() => {
                    this.toast.info(this.translate.instant('i18n_attachment_removed'));
                    delete exam.languageInspection?.statement.attachment;
                }),
                map(() => void 0),
                catchError((err) => {
                    this.toast.error(err);
                    return EMPTY;
                }),
            );

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
        // Backend streams Base64-encoded chunks (proxy to external API); must decode as text
        this.Files.download(`/app/iop/collab/attachment/${id}`, fileName, { asBlob: false });
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

    selectFile$ = (
        isTeacherModal: boolean,
        params?: unknown,
        title = 'i18n_attachment_selection',
    ): Observable<FileResult> => {
        const modalRef = this.modal.openRef(AttachmentSelectorComponent);
        Object.assign(modalRef.componentInstance, params);
        modalRef.componentInstance.isTeacherModal.set(isTeacherModal);
        modalRef.componentInstance.title.set(title);
        return this.modal.result$<FileResult>(modalRef);
    };

    private removeAnswerAttachment$ = (url: string, question: AnsweredQuestion): Observable<void> =>
        this.dialogs.open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure')).pipe(
            switchMap(() => this.http.delete<{ objectVersion?: number }>(url, {})),
            tap((resp) => {
                this.toast.info(this.translate.instant('i18n_attachment_removed'));
                question.essayAnswer.objectVersion = resp?.objectVersion ? resp.objectVersion : 0;
                delete question.essayAnswer.attachment;
            }),
            map(() => void 0),
            catchError((err) => {
                this.toast.error(err);
                return EMPTY;
            }),
        );

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
