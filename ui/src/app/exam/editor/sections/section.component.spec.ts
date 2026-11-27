// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import type { ExamSection } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { errorInterceptor } from 'src/app/interceptors/error.interceptor';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import type { ExamSectionQuestion } from 'src/app/question/question.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FileService } from 'src/app/shared/file/file.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { SectionComponent } from './section.component';

describe('SectionComponent', () => {
    let component: SectionComponent;
    let fixture: ComponentFixture<SectionComponent>;
    let http: HttpTestingController;
    let emitted: ExamSection[];
    const toast = { info: vi.fn(), warning: vi.fn(), error: vi.fn() };
    const modalResult = new Subject<unknown>();
    const modalRef = {
        componentInstance: {
            examId: { set: vi.fn() },
            sectionId: { set: vi.fn() },
            questionCount: { set: vi.fn() },
            collaborative: { set: vi.fn() },
        },
    };
    const modal = { openRef: vi.fn(() => modalRef), result$: vi.fn(() => modalResult) };
    const files = { upload$: vi.fn() };

    const sq = (id: number, max = 5) =>
        ({
            id,
            sequenceNumber: id - 1,
            max,
            question: { id: id * 10, question: `<p>Q${id}</p>` },
        }) as unknown as ExamSectionQuestion;
    const section = (overrides: Partial<ExamSection> = {}) =>
        ({
            id: 2,
            name: 'Basics',
            description: 'Intro',
            optional: false,
            lotteryOn: false,
            lotteryItemCount: 1,
            expanded: true,
            sectionQuestions: [sq(1), sq(2), sq(3)],
            ...overrides,
        }) as ExamSection;

    const create = (s: ExamSection = section(), collaborative = false) => {
        fixture = TestBed.createComponent(SectionComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('section', s);
        fixture.componentRef.setInput('examId', 7);
        fixture.componentRef.setInput('collaborative', collaborative);
        emitted = [];
        component.updated.subscribe((u) => emitted.push(u));
        fixture.detectChanges();
    };
    const sectionPut = (base = '/app/exams') => http.expectOne(`${base}/7/sections/2`);
    const refuse = (req: ReturnType<HttpTestingController['expectOne']>) =>
        req.flush('i18n_error_future_reservations_exist', { status: 403, statusText: 'Forbidden' });

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [SectionComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(withInterceptors([errorInterceptor])),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
                { provide: ConfirmationDialogService, useValue: { open$: vi.fn(() => of(true)) } },
                { provide: ModalService, useValue: modal },
                { provide: FileService, useValue: files },
                { provide: ExamService, useValue: { getSectionMaxScore: () => 15 } },
                {
                    provide: QuestionScoringService,
                    useValue: { calculateMaxScore: (q: { max: number }) => q.max },
                },
            ],
        });
        TestBed.overrideComponent(SectionComponent, { set: { imports: [], template: '' } });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    describe('lottery', () => {
        it('should be possible only with two or more questions of equal points', () => {
            create();
            expect(component.lotteryDisabled()).toBe(false);

            create(section({ sectionQuestions: [sq(1)] }));
            expect(component.lotteryDisabled()).toBe(true);

            create(section({ sectionQuestions: [sq(1, 5), sq(2, 3)] }));
            expect(component.questionPointsMatch()).toBe(false);
            expect(component.lotteryDisabled()).toBe(true);
        });

        it('should switch on with one question drawn', () => {
            create();
            component.sectionForm.lotteryOn().value.set(true);

            component.toggleLottery();
            const req = sectionPut();
            expect(req.request.body).toMatchObject({ lotteryOn: true, lotteryItemCount: 1 });
            req.flush({});

            expect(emitted.at(-1)).toMatchObject({ lotteryOn: true, lotteryItemCount: 1 });
        });

        it('should not switch on when not possible', () => {
            create(section({ sectionQuestions: [sq(1)] }));
            component.sectionForm.lotteryOn().value.set(true);

            component.toggleLottery();

            expect(component.sectionForm.lotteryOn().value()).toBe(false);
            expect(emitted.at(-1)?.lotteryOn).toBe(false);
        });

        it('should keep the count between one and the question count', () => {
            create(section({ lotteryOn: true, lotteryItemCount: 2 }));

            component.sectionForm.lotteryItemCount().value.set(9);
            component.updateLotteryCount();
            expect(sectionPut().request.body.lotteryItemCount).toBe(3);

            component.sectionForm.lotteryItemCount().value.set(0);
            component.updateLotteryCount();
            expect(sectionPut().request.body.lotteryItemCount).toBe(1);
            expect(toast.warning).toHaveBeenCalledTimes(2);
        });
    });

    describe('saving', () => {
        it('should save the name, description and optionality', () => {
            create();
            component.sectionForm.name().value.set('Advanced');
            component.sectionForm.optional().value.set(true);

            component.renameSection();
            const req = sectionPut();
            expect(req.request.body).toEqual({
                id: 2,
                name: 'Advanced',
                description: 'Intro',
                lotteryOn: false,
                lotteryItemCount: 0,
                expanded: true,
                optional: true,
            });
            req.flush({});

            expect(emitted).toEqual([expect.objectContaining({ name: 'Advanced', optional: true })]);
            expect(toast.info).toHaveBeenCalledWith('i18n_section_updated');
        });

        it('should put everything back and say why when the change is refused', () => {
            create();
            component.sectionForm.optional().value.set(true);

            component.renameSection();
            refuse(sectionPut());

            expect(toast.error).toHaveBeenCalledWith('i18n_error_future_reservations_exist');
            expect(component.sectionForm.optional().value()).toBe(false);
            expect(emitted.at(-1)).toEqual(section());
        });

        it('should save to IOP for a collaborative exam', () => {
            create(section(), true);
            component.renameSection();
            sectionPut('/app/iop/exams').flush({});
        });

        it('should toggle and save the expanded state quietly', () => {
            create();

            component.toggleExpanded();
            sectionPut().flush({});

            expect(component.expanded()).toBe(false);
            expect(emitted.at(-1)?.expanded).toBe(false);
            expect(toast.info).not.toHaveBeenCalled();
        });
    });

    describe('questions', () => {
        it('should clear all and keep the lottery off afterwards', () => {
            create(section({ lotteryOn: true, lotteryItemCount: 2 }));

            component.clearAllQuestions();
            http.expectOne('/app/exams/7/sections/2/questions').flush(null);
            expect(emitted.at(-1)).toMatchObject({ sectionQuestions: [], lotteryOn: false });

            component.renameSection();
            expect(sectionPut().request.body).toMatchObject({ lotteryOn: false, lotteryItemCount: 0 });
        });

        it('should turn the lottery off when fewer than two questions remain', () => {
            create(section({ lotteryOn: true, lotteryItemCount: 2, sectionQuestions: [sq(1), sq(2)] }));

            component.removeQuestion(sq(1));
            http.expectOne('/app/exams/7/sections/2/questions/10').flush({ lotteryItemCount: 1 });

            expect(emitted.at(-1)).toMatchObject({ lotteryOn: false, lotteryItemCount: 1 });
            expect(sectionPut().request.body).toMatchObject({ lotteryOn: false, lotteryItemCount: 0 });
        });

        it('should keep the lowered lottery count after a question is removed', () => {
            create(section({ lotteryOn: true, lotteryItemCount: 3 }));

            component.removeQuestion(sq(1));
            http.expectOne('/app/exams/7/sections/2/questions/10').flush({ lotteryItemCount: 2 });

            expect(emitted.at(-1)).toMatchObject({ lotteryItemCount: 2 });
            expect(emitted.at(-1)?.sectionQuestions.map((q) => q.id)).toEqual([2, 3]);
            expect(sectionPut().request.body).toMatchObject({ lotteryOn: true, lotteryItemCount: 2 });
        });

        it('should reorder and renumber', () => {
            create();

            component.moveQuestion({ previousIndex: 0, currentIndex: 2 } as CdkDragDrop<string[]>);
            const req = http.expectOne('/app/exams/7/sections/2/reorder');
            expect(req.request.body).toEqual({ from: 0, to: 2 });
            req.flush(null);

            expect(emitted.at(-1)?.sectionQuestions.map((q) => [q.id, q.sequenceNumber])).toEqual([
                [2, 0],
                [3, 1],
                [1, 2],
            ]);
        });

        it('should show why reordering failed', () => {
            create();

            component.moveQuestion({ previousIndex: 0, currentIndex: 1 } as CdkDragDrop<string[]>);
            refuse(http.expectOne('/app/exams/7/sections/2/reorder'));

            expect(toast.error).toHaveBeenCalledWith('i18n_error_future_reservations_exist');
            expect(emitted).toEqual([]);
        });

        it('should copy a question through the backend and add it below the original', () => {
            create();

            component.copyQuestion(sq(1));
            http.expectOne('/app/question/10').flush({ id: 99 });
            const insert = http.expectOne('/app/exams/7/sections/2/questions/99');
            expect(insert.request.body).toEqual({ sequenceNumber: 1, question: undefined });
            insert.flush({ sectionQuestions: [{ id: 50, sequenceNumber: 1, question: { id: 99 } }] });

            const questions = emitted.at(-1)?.sectionQuestions;
            expect(questions?.map((q) => q.id)).toEqual([1, 50, 2, 3]);
            expect(questions?.map((q) => q.sequenceNumber)).toEqual([0, 1, 2, 3]);
            expect(toast.info).toHaveBeenCalledWith('i18n_question_copied');
        });

        it('should copy a collaborative question without its attachment', () => {
            const original = sq(1);
            original.question.attachment = { fileName: 'a.pdf' } as never;
            create(section(), true);

            component.copyQuestion(original);
            const insert = http.expectOne('/app/iop/exams/7/sections/2/questions');
            expect(insert.request.body.question).toMatchObject({
                question: '<p>**COPY**</p><p>Q1</p>',
                attachment: undefined,
            });
            expect(insert.request.body.sequenceNumber).toBe(1);
            insert.flush({ id: 51, sequenceNumber: 1, question: { id: 51 } });

            expect(emitted.at(-1)?.sectionQuestions.map((q) => q.id)).toEqual([1, 51, 2, 3]);
            expect(files.upload$).not.toHaveBeenCalled();
        });

        it('should add questions picked from the library', () => {
            create();

            component.openLibrary();
            modalResult.next([sq(4)]);

            expect(modalRef.componentInstance.questionCount.set).toHaveBeenCalledWith(3);
            expect(emitted.at(-1)?.sectionQuestions.map((q) => q.id)).toEqual([1, 2, 3, 4]);
        });

        it('should not add questions while the lottery is on', () => {
            create(section({ lotteryOn: true }));

            component.openLibrary();
            component.addNewQuestion();

            expect(modal.openRef).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith('i18n_error_drop_disabled_lottery_on');
        });
    });

    it('should count selection-evaluated questions', () => {
        create(
            section({
                sectionQuestions: [{ ...sq(1), evaluationType: 'Selection' }, sq(2)] as ExamSectionQuestion[],
            }),
        );
        expect(component.getAmountOfSelectionEvaluatedQuestions()).toBe(1);
        expect(component.getSectionTotalScore()).toBe(15);
    });
});
