// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import type { ExamSection } from 'src/app/exam/exam.model';
import { errorInterceptor } from 'src/app/interceptors/error.interceptor';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import type { ExamSectionQuestion, Question } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FileService } from 'src/app/shared/file/file.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { SectionQuestionComponent } from './section-question.component';

describe('SectionQuestionComponent', () => {
    let component: SectionQuestionComponent;
    let fixture: ComponentFixture<SectionQuestionComponent>;
    let http: HttpTestingController;
    let emitted: ExamSectionQuestion[];
    let modalResult: Subject<unknown>;
    const toast = { info: vi.fn(), error: vi.fn() };
    const set = () => ({ set: vi.fn() });
    const modalRef = {
        componentInstance: {
            lotteryOn: set(),
            collaborative: set(),
            examId: set(),
            question: set(),
            questionId: set(),
            examQuestion: set(),
        },
    };
    const modal = { openRef: vi.fn(() => modalRef), result$: vi.fn(() => modalResult) };
    const questions = {
        getQuestionDistribution$: vi.fn(() => of({ distributed: false })),
        updateDistributedExamQuestion$: vi.fn(),
    };
    const attachments = {
        downloadQuestionAttachment: vi.fn(),
        downloadCollaborativeQuestionAttachment: vi.fn(),
        eraseCollaborativeQuestionAttachment$: vi.fn(() => of(undefined)),
    };
    const files = { upload$: vi.fn() };

    const sectionQuestion = () =>
        ({
            id: 5,
            maxScore: 2,
            question: { id: 50, question: 'Old', attachment: { id: 1, fileName: 'a.pdf' } },
        }) as unknown as ExamSectionQuestion;

    const create = (collaborative = false) => {
        fixture = TestBed.createComponent(SectionQuestionComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('section', { id: 2 } as ExamSection);
        fixture.componentRef.setInput('sectionQuestion', sectionQuestion());
        fixture.componentRef.setInput('examId', 7);
        fixture.componentRef.setInput('collaborative', collaborative);
        emitted = [];
        component.updated.subscribe((u) => emitted.push(u));
    };

    beforeEach(() => {
        vi.clearAllMocks();
        modalResult = new Subject();
        TestBed.configureTestingModule({
            imports: [SectionQuestionComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(withInterceptors([errorInterceptor])),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
                { provide: ConfirmationDialogService, useValue: { open$: vi.fn(() => of(true)) } },
                { provide: ModalService, useValue: modal },
                { provide: QuestionService, useValue: questions },
                { provide: QuestionScoringService, useValue: {} },
                { provide: AttachmentService, useValue: attachments },
                { provide: FileService, useValue: files },
            ],
        });
        TestBed.overrideComponent(SectionQuestionComponent, { set: { imports: [], template: '' } });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    describe('editing', () => {
        it('should open a plain question by id and save it to the section', () => {
            create();

            component.editQuestion();
            expect(modalRef.componentInstance.questionId.set).toHaveBeenCalledWith(50);
            modalResult.next({ id: 50, question: 'New' } as Question);

            const req = http.expectOne('/app/exams/7/sections/2/questions/5');
            expect(req.request.body).toEqual({ question: { id: 50, question: 'New' } });
            req.flush({ question: { question: 'New' } });

            expect(emitted).toEqual([
                expect.objectContaining({
                    maxScore: 2,
                    question: expect.objectContaining({ id: 50, question: 'New' }),
                }),
            ]);
        });

        it('should show why saving failed', () => {
            create();

            component.editQuestion();
            modalResult.next({ id: 50 } as Question);
            http.expectOne('/app/exams/7/sections/2/questions/5').flush('i18n_error_access_forbidden', {
                status: 403,
                statusText: 'Forbidden',
            });

            expect(toast.error).toHaveBeenCalledWith('i18n_error_access_forbidden');
            expect(emitted).toEqual([]);
        });

        it('should edit a question used in several exams in the distributed editor', () => {
            questions.getQuestionDistribution$.mockReturnValue(of({ distributed: true }));
            questions.updateDistributedExamQuestion$.mockReturnValue(of({ maxScore: 3 }));
            create();

            component.editQuestion();
            modalResult.next({ question: { id: 50 }, examQuestion: { id: 5 } });

            expect(questions.updateDistributedExamQuestion$).toHaveBeenCalledWith({ id: 50 }, { id: 5 }, 7, 2);
            expect(emitted.at(-1)?.maxScore).toBe(3);
            expect(toast.info).toHaveBeenCalledWith('i18n_question_saved');
        });

        describe('collaborative', () => {
            it('should pass the question itself and save to IOP', () => {
                create(true);

                component.editQuestion();
                expect(questions.getQuestionDistribution$).not.toHaveBeenCalled();
                expect(modalRef.componentInstance.question.set).toHaveBeenCalled();
                modalResult.next({ id: 50 } as Question);
                http.expectOne('/app/iop/exams/7/sections/2/questions/5').flush({});

                expect(emitted).toHaveLength(1);
            });

            it('should upload a changed attachment', () => {
                files.upload$.mockReturnValue(of({ id: 9, fileName: 'b.pdf' }));
                create(true);

                component.editQuestion();
                modalResult.next({ id: 50, attachment: { modified: true, file: new File([], 'b.pdf') } });
                http.expectOne('/app/iop/exams/7/sections/2/questions/5').flush({});

                expect(files.upload$.mock.calls[0][0]).toBe('/app/iop/collab/attachment/question');
                expect(files.upload$.mock.calls[0][2]).toEqual({ examId: '7', questionId: '5' });
                expect(emitted.at(-1)?.question.attachment).toEqual({ id: 9, fileName: 'b.pdf' });
            });

            it('should erase a removed attachment', () => {
                create(true);

                component.editQuestion();
                modalResult.next({ id: 50, attachment: { removed: true } });
                http.expectOne('/app/iop/exams/7/sections/2/questions/5').flush({});

                expect(attachments.eraseCollaborativeQuestionAttachment$).toHaveBeenCalledWith(7, 5);
                expect(emitted.at(-1)?.question.attachment).toBeUndefined();
            });
        });
    });

    describe('attachment download', () => {
        it('should download a local attachment', () => {
            create();
            component.downloadQuestionAttachment();
            expect(attachments.downloadQuestionAttachment).toHaveBeenCalled();
        });

        it('should download only from IOP in a collaborative exam', () => {
            create(true);
            component.downloadQuestionAttachment();
            expect(attachments.downloadCollaborativeQuestionAttachment).toHaveBeenCalledWith(7, sectionQuestion());
            expect(attachments.downloadQuestionAttachment).not.toHaveBeenCalled();
        });
    });

    it('should pass on removal and copying once confirmed', () => {
        create();
        const removed = vi.fn();
        const copied = vi.fn();
        component.removed.subscribe(removed);
        component.copied.subscribe(copied);

        component.removeQuestion();
        component.copyQuestion();

        expect(removed).toHaveBeenCalledWith(sectionQuestion());
        expect(copied).toHaveBeenCalledWith(sectionQuestion());
    });
});
