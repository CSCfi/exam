// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Observable, from } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import type { ExamParticipation, ReviewedExam } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';
import type { Examination } from 'src/app/examination/examination.model';
import { ExamSectionQuestion, Question } from 'src/app/question/question.model';
import type { ReviewQuestion } from 'src/app/review/review.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';
import { FileService } from 'src/app/shared/file/file.service';
import { AnsweredQuestion, FileResult } from './attachment.model';
import { AttachmentSelectorComponent } from './dialogs/attachment-picker.component';

@Injectable({ providedIn: 'root' })
export class AttachmentService {
    constructor(
        private dialogs: ConfirmationDialogService,
        private http: HttpClient,
        private modal: NgbModal,
        private translate: TranslateService,
        private toast: ToastrService,
        private Files: FileService,
        private errorHandler: ErrorHandlingService,
    ) {}

    removeQuestionAttachment(question: Partial<Question>) {
        if (question.attachment) {
            question.attachment.removed = true;
        }
    }

    eraseQuestionAttachment$ = (question: Question): Observable<void> =>
        this.http
            .delete<void>(this.questionAttachmentApi(question.id))
            .pipe(catchError((error) => this.errorHandler.handle(error, 'AttachmentService.eraseQuestionAttachment$')));

    eraseCollaborativeQuestionAttachment$ = (examId: number, questionId: number): Observable<void> =>
        this.http
            .delete<void>(this.collaborativeQuestionAttachmentApi(examId, questionId))
            .pipe(
                catchError((error) =>
                    this.errorHandler.handle(error, 'AttachmentService.eraseCollaborativeQuestionAttachment$'),
                ),
            );

    removeQuestionAnswerAttachment(question: AnsweredQuestion) {
        this.removeAnswerAttachment$(this.answerAttachmentApi(question.id), question).subscribe();
    }

    removeExternalQuestionAnswerAttachment(question: AnsweredQuestion, hash: string) {
        this.removeAnswerAttachment$(this.externalAnswerAttachmentApi(question.id, hash), question).subscribe();
    }

    removeExamAttachment$ = (exam: Exam, collaborative = false): Observable<void> =>
        this.dialogs.open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure')).pipe(
            switchMap(() => {
                const api = collaborative ? this.collaborativeExamAttachmentApi : this.examAttachmentApi;
                return this.http.delete<void>(api(exam.id)).pipe(
                    tap(() => {
                        this.toast.info(this.translate.instant('i18n_attachment_removed'));
                        delete exam.attachment;
                    }),
                    catchError((error) => this.errorHandler.handle(error, 'AttachmentService.removeExamAttachment$')),
                );
            }),
        );

    removeFeedbackAttachment$ = (exam: Examination): Observable<void> =>
        this.dialogs.open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure')).pipe(
            switchMap(() =>
                this.http.delete<void>(this.feedbackAttachmentApi(exam.id)).pipe(
                    tap(() => {
                        this.toast.info(this.translate.instant('i18n_attachment_removed'));
                        delete exam.examFeedback?.attachment;
                    }),
                    catchError((error) =>
                        this.errorHandler.handle(error, 'AttachmentService.removeFeedbackAttachment$'),
                    ),
                ),
            ),
        );

    removeCollaborativeExamFeedbackAttachment$ = (
        id: number,
        ref: string,
        participation: ExamParticipation,
    ): Observable<void> =>
        this.dialogs.open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure')).pipe(
            switchMap(() =>
                this.http.delete<{ rev: string }>(`/app/iop/collab/attachment/exam/${id}/${ref}/feedback`).pipe(
                    tap((resp) => {
                        this.toast.info(this.translate.instant('i18n_attachment_removed'));
                        participation._rev = resp.rev;
                        delete participation.exam.examFeedback?.attachment;
                    }),
                    map(() => void 0),
                    catchError((error) =>
                        this.errorHandler.handle(error, 'AttachmentService.removeCollaborativeExamFeedbackAttachment$'),
                    ),
                ),
            ),
        );

    removeStatementAttachment$ = (exam: Exam): Observable<void> =>
        this.dialogs.open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure')).pipe(
            switchMap(() =>
                this.http.delete<void>(this.statementAttachmentApi(exam.id)).pipe(
                    tap(() => {
                        this.toast.info(this.translate.instant('i18n_attachment_removed'));
                        delete exam.languageInspection?.statement.attachment;
                    }),
                    catchError((error) =>
                        this.errorHandler.handle(error, 'AttachmentService.removeStatementAttachment$'),
                    ),
                ),
            ),
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

    selectFile$(
        isTeacherModal: boolean,
        params?: unknown,
        title = 'i18n_attachment_selection',
    ): Observable<FileResult> {
        const modalRef = this.modal.open(AttachmentSelectorComponent, {
            backdrop: 'static',
            keyboard: false,
            windowClass: 'xm-xxl-modal',
        });
        modalRef.componentInstance.isTeacherModal = isTeacherModal;
        modalRef.componentInstance.title = title;
        if (params) {
            modalRef.componentInstance.params = params;
        }
        return from(modalRef.result).pipe(
            map((result: FileResult) => result),
            catchError((error) => this.errorHandler.handle(error, 'AttachmentService.selectFile$')),
        );
    }

    private removeAnswerAttachment$ = (url: string, question: AnsweredQuestion): Observable<void> =>
        this.dialogs.open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_are_you_sure')).pipe(
            switchMap(() =>
                this.http.delete<void>(url).pipe(
                    tap(() => {
                        this.toast.info(this.translate.instant('i18n_attachment_removed'));
                        delete question.essayAnswer.attachment;
                    }),
                    catchError((error) => this.errorHandler.handle(error, 'AttachmentService.removeAnswerAttachment$')),
                ),
            ),
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
        if (external) {
            return url.replace('/app/attachment/', '/app/iop/attachment/');
        }
        if (collaborative) {
            return url.replace('/app/attachment/', '/app/iop/collab/attachment/');
        }
        return url;
    }
}
