// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY, of } from 'rxjs';
import type { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';
import type { ExamSectionQuestion } from 'src/app/question/question.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FileService } from 'src/app/shared/file/file.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { AttachmentService } from './attachment.service';

type Answered = Parameters<AttachmentService['removeQuestionAnswerAttachment']>[0];

describe('AttachmentService', () => {
    let service: AttachmentService;
    let http: HttpTestingController;
    const files = { download: vi.fn() };
    const dialogs = { open$: vi.fn() };
    const toast = { info: vi.fn(), error: vi.fn() };
    const isTeacherModal = signal(false);
    const title = signal('');
    const modal = {
        openRef: vi.fn(() => ({ componentInstance: { isTeacherModal, title } })),
        result$: vi.fn(() => of({ $value: { attachmentFile: 'f' } })),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        dialogs.open$.mockReturnValue(of(true));
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: FileService, useValue: files },
                { provide: ConfirmationDialogService, useValue: dialogs },
                { provide: ToastService, useValue: toast },
                { provide: ModalService, useValue: modal },
            ],
        });
        service = TestBed.inject(AttachmentService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    const downloaded = () => files.download.mock.calls.map((c) => [c[0], c[1]]);
    const del = (url: string) => http.expectOne((r) => r.method === 'DELETE' && r.url === url);
    const file = { fileName: 'notes.pdf', id: 1, externalId: 'ext-1' };

    describe('downloading', () => {
        it('should fetch an exam attachment locally, from a visit or from a collaborative exam', () => {
            service.downloadExamAttachment({ id: 5, hash: 'h5', attachment: file } as unknown as Exam);
            service.downloadExamAttachment({ id: 5, hash: 'h5', external: true, attachment: file } as unknown as Exam);
            service.downloadExamAttachment({ id: 5, attachment: file } as unknown as Exam, true);
            expect(downloaded()).toEqual([
                ['/app/attachment/exam/5', 'notes.pdf'],
                ['/app/iop/attachment/exam/h5', 'notes.pdf'],
                ['/app/iop/collab/attachment/exam/5', 'notes.pdf'],
            ]);
        });

        it('should fetch question attachments by where the question is', () => {
            const sq = { id: 7, question: { attachment: file } } as unknown as ExamSectionQuestion;
            service.downloadQuestionAttachment({ id: 3, attachment: file } as never);
            service.downloadExternalQuestionAttachment({ hash: 'h5' } as Exam, sq);
            service.downloadCollaborativeQuestionAttachment(5, sq);
            expect(downloaded()).toEqual([
                ['/app/attachment/question/3', 'notes.pdf'],
                ['/app/iop/attachment/exam/h5/question/7', 'notes.pdf'],
                ['/app/iop/collab/attachment/exam/5/question/7', 'notes.pdf'],
            ]);
        });

        it('should fetch the answer, feedback and statement attachments', () => {
            service.downloadQuestionAnswerAttachment({
                id: 9,
                essayAnswer: { attachment: file },
            } as unknown as Answered);
            const exam = {
                id: 5,
                examFeedback: { attachment: file },
                languageInspection: { statement: { attachment: file } },
            } as unknown as Exam;
            service.downloadFeedbackAttachment(exam);
            service.downloadStatementAttachment(exam);
            expect(downloaded()).toEqual([
                ['/app/attachment/question/9/answer', 'notes.pdf'],
                ['/app/attachment/exam/5/feedback', 'notes.pdf'],
                ['/app/attachment/exam/5/statement', 'notes.pdf'],
            ]);
        });

        it('should decode a collaborative attachment as text, as it arrives Base64-encoded', () => {
            service.downloadCollaborativeAttachment('ext-1', 'notes.pdf');
            expect(files.download).toHaveBeenCalledWith('/app/iop/collab/attachment/ext-1', 'notes.pdf', {
                asBlob: false,
            });
        });

        it('should do nothing when there is no attachment', () => {
            const sq = { id: 7, question: {} } as unknown as ExamSectionQuestion;
            service.downloadExamAttachment({ id: 5 } as Exam);
            service.downloadQuestionAttachment({ id: 3 });
            service.downloadExternalQuestionAttachment({ hash: 'h' } as Exam, sq);
            service.downloadCollaborativeQuestionAttachment(5, {
                id: 7,
                question: { attachment: { fileName: 'x' } },
            } as never);
            service.downloadQuestionAnswerAttachment({ id: 9, essayAnswer: {} } as unknown as Answered);
            service.downloadFeedbackAttachment({ id: 5 } as Exam);
            service.downloadStatementAttachment({ id: 5 } as Exam);
            expect(files.download).not.toHaveBeenCalled();
        });
    });

    describe('removing', () => {
        it("should remove an answer's attachment on confirmation, taking the new version", () => {
            const question = { id: 9, essayAnswer: { attachment: file, objectVersion: 1 } } as unknown as Answered;
            let done = false;
            service.removeQuestionAnswerAttachment(question).subscribe(() => (done = true));
            del('/app/attachment/question/9/answer').flush({ objectVersion: 2 });

            expect(done).toBe(true);
            expect(question.essayAnswer.attachment).toBeUndefined();
            expect(question.essayAnswer.objectVersion).toBe(2);
            expect(toast.info).toHaveBeenCalledWith('i18n_attachment_removed');
        });

        it("should remove a visiting student's answer attachment through the visit", () => {
            const question = { id: 9, essayAnswer: { attachment: file } } as unknown as Answered;
            service.removeExternalQuestionAnswerAttachment(question, 'h5').subscribe();
            del('/app/iop/attachment/question/9/answer/h5').flush(null);
            expect(question.essayAnswer.objectVersion).toBe(0);
        });

        it('should remove nothing when the confirmation is cancelled', () => {
            dialogs.open$.mockReturnValue(EMPTY);
            const question = { id: 9, essayAnswer: { attachment: file } } as unknown as Answered;
            service.removeQuestionAnswerAttachment(question).subscribe();
            service.removeFeedbackAttachment({ id: 5 } as never).subscribe();
            http.expectNone(() => true);
            expect(question.essayAnswer.attachment).toBe(file);
        });

        it('should keep the attachment and tell why when removing fails', () => {
            const question = { id: 9, essayAnswer: { attachment: file } } as unknown as Answered;
            service.removeQuestionAnswerAttachment(question).subscribe();
            del('/app/attachment/question/9/answer').flush('locked', { status: 403, statusText: 'Forbidden' });
            expect(question.essayAnswer.attachment).toBe(file);
            expect(toast.error).toHaveBeenCalled();
        });

        it('should remove the feedback and statement attachments from the exam', () => {
            const exam = {
                id: 5,
                examFeedback: { attachment: file },
                languageInspection: { statement: { attachment: file } },
            } as unknown as Exam;
            service.removeFeedbackAttachment(exam as never).subscribe();
            del('/app/attachment/exam/5/feedback').flush({});
            service.removeStatementAttachment(exam).subscribe();
            del('/app/attachment/exam/5/statement').flush({});

            expect(exam.examFeedback?.attachment).toBeUndefined();
            expect(exam.languageInspection?.statement.attachment).toBeUndefined();
        });

        it('should take the new revision of a collaborative attempt after removing its feedback attachment', () => {
            const participation = {
                _rev: 'r1',
                exam: { examFeedback: { attachment: file } },
            } as unknown as ExamParticipation;
            service.removeCollaborativeExamFeedbackAttachment(5, 'ref-1', participation).subscribe();
            del('/app/iop/collab/attachment/exam/5/ref-1/feedback').flush({ rev: 'r2' });
            expect(participation._rev).toBe('r2');
            expect(participation.exam.examFeedback?.attachment).toBeUndefined();
        });

        it('should remove an exam attachment locally or from a collaborative exam', () => {
            let removed = 0;
            service.removeExamAttachment$({ id: 5 } as Exam).subscribe(() => removed++);
            del('/app/attachment/exam/5').flush({});
            service.removeExamAttachment$({ id: 5 } as Exam, true).subscribe(() => removed++);
            del('/app/iop/collab/attachment/exam/5').flush({});
            expect(removed).toBe(2);
        });

        it('should erase question attachments without asking', () => {
            service.eraseQuestionAttachment$({ id: 3 } as never).subscribe();
            del('/app/attachment/question/3').flush(null);
            service.eraseCollaborativeQuestionAttachment$(5, 3).subscribe();
            del('/app/iop/collab/attachment/exam/5/question/3').flush(null);
            expect(dialogs.open$).not.toHaveBeenCalled();
        });
    });

    describe('choosing a file', () => {
        it('should open the selector for teachers or students, with its title', () => {
            let result: unknown;
            service.selectFile$(true, { someParam: 1 }, 'i18n_title').subscribe((r) => (result = r));
            expect(isTeacherModal()).toBe(true);
            expect(title()).toBe('i18n_title');
            expect(result).toEqual({ $value: { attachmentFile: 'f' } });
        });

        it('should give file sizes in kilobytes', () => {
            expect(service.getFileSize(1499)).toBe('1 kB');
            expect(service.getFileSize(250_600)).toBe('251 kB');
        });
    });
});
