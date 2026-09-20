// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import type { Attachment } from 'src/app/shared/attachment/attachment.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { FileService } from 'src/app/shared/file/file.service';
import { vi } from 'vitest';
import type { ExamSectionQuestion, Question, QuestionDraft } from './question.model';
import { QuestionService } from './question.service';

/**
 * An attachment picked in the editor is uploaded as part of saving the question. A removal staged in
 * the same editing session has to win over any file still sitting in the question, or the file the
 * teacher just deleted gets uploaded anyway.
 */
describe('QuestionService attachment save', () => {
    let service: QuestionService;
    let httpMock: HttpTestingController;
    let upload$: ReturnType<typeof vi.fn>;
    let eraseQuestionAttachment$: ReturnType<typeof vi.fn>;

    const removedAttachment = (): Attachment => ({
        id: 42,
        fileName: 'gone.pdf',
        size: 1000,
        removed: true,
        modified: true,
        file: new File(['x'], 'gone.pdf'),
    });

    const makeQuestion = (attachment: Attachment): Question =>
        ({
            id: 1,
            type: 'EssayQuestion',
            question: 'Text',
            options: [],
            tags: [],
            questionOwners: [],
            state: 'DRAFT',
            defaultNegativeScoreAllowed: false,
            defaultOptionShufflingOn: false,
            attachment,
        }) as unknown as Question;

    beforeEach(() => {
        upload$ = vi.fn().mockReturnValue(of({ id: 99, fileName: 'gone.pdf' }));
        eraseQuestionAttachment$ = vi.fn().mockReturnValue(of(undefined));
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                QuestionService,
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ToastrService, useValue: { info: vi.fn(), error: vi.fn() } },
                { provide: FileService, useValue: { upload$ } },
                { provide: AttachmentService, useValue: { eraseQuestionAttachment$ } },
            ],
        });
        service = TestBed.inject(QuestionService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should erase instead of upload when a question with a pending file is saved after removal', () => {
        const question = makeQuestion(removedAttachment());

        service.updateQuestion$(question).subscribe();
        httpMock.expectOne({ method: 'PUT', url: '/app/questions/1' }).flush(question);

        expect(eraseQuestionAttachment$).toHaveBeenCalledWith(question);
        expect(upload$).not.toHaveBeenCalled();
    });

    it('should still upload a pending file that was not removed', () => {
        const question = makeQuestion({ ...removedAttachment(), removed: false });

        service.updateQuestion$(question).subscribe();
        httpMock.expectOne({ method: 'PUT', url: '/app/questions/1' }).flush(question);

        expect(upload$).toHaveBeenCalled();
        expect(eraseQuestionAttachment$).not.toHaveBeenCalled();
    });

    it('should not upload a removed file when creating a question', () => {
        const draft = makeQuestion(removedAttachment()) as unknown as QuestionDraft;

        service.createQuestion$(draft).subscribe();
        httpMock.expectOne({ method: 'POST', url: '/app/questions' }).flush({ id: 1 });

        expect(upload$).not.toHaveBeenCalled();
    });

    it('should erase instead of upload for a distributed exam question', () => {
        const question = makeQuestion(removedAttachment());
        const sectionQuestion = { id: 5, question, options: [] } as unknown as ExamSectionQuestion;

        service.updateDistributedExamQuestion$(question, sectionQuestion, 7, 3).subscribe();
        httpMock
            .expectOne({ method: 'PUT', url: '/app/exams/7/sections/3/questions/5/distributed' })
            .flush({ id: 5, question: { ...question } });

        expect(eraseQuestionAttachment$).toHaveBeenCalledWith(question);
        expect(upload$).not.toHaveBeenCalled();
    });
});
