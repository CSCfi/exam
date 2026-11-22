// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormGroup, FormGroupDirective } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { QuestionAdapterService } from 'src/app/question/editor/common/tools/question-adapter.service';
import { MultipleChoiceComponent } from 'src/app/question/editor/common/types/multiple-choice.component';
import { WeightedMultipleChoiceComponent } from 'src/app/question/editor/common/types/weighted-multiple-choice.component';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import type { ExamSectionQuestion, MultipleChoiceOption, ReverseQuestion } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import { SessionService } from 'src/app/session/session.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { QuestionComponent } from './question.component';

// Removing an option in the middle must not shift the remaining rows onto other stored options:
// the backend matches options by id, and exam copies keep their own scores per option.
describe('Question option editing', () => {
    const updateQuestion$ = vi.fn((q: unknown) => of(q));
    const option = (id: number, text: string, defaultScore: number, correctOption = defaultScore > 0) =>
        ({ id, option: text, defaultScore, correctOption }) as MultipleChoiceOption;

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                { provide: ToastService, useValue: { info: vi.fn(), error: vi.fn() } },
                { provide: Router, useValue: { navigate: vi.fn() } },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: { data: {}, paramMap: convertToParamMap({}), queryParamMap: convertToParamMap({}) },
                    },
                },
                { provide: SessionService, useValue: { getUser: () => ({ id: 1 }) } },
                { provide: QuestionService, useValue: { updateQuestion$ } },
                {
                    provide: QuestionScoringService,
                    useValue: { calculateDefaultMaxPoints: () => 0, calculateDefaultMinPoints: () => 0 },
                },
                { provide: FormGroupDirective, useValue: { form: new FormGroup({}) } },
            ],
        });
        for (const type of [QuestionComponent, WeightedMultipleChoiceComponent, MultipleChoiceComponent]) {
            TestBed.overrideComponent(type as Type<unknown>, { set: { imports: [], template: '' } });
        }
    });

    const optionEditor = <T>(type: Type<T>, question: Partial<ReverseQuestion>) => {
        const fixture = TestBed.createComponent(type);
        fixture.componentRef.setInput('question', question);
        fixture.componentRef.setInput('allowOptionRemoval', true);
        fixture.detectChanges();
        return fixture.componentInstance;
    };

    const saveWith = (question: ReverseQuestion, body: Record<string, FormGroup>) => {
        const fixture = TestBed.createComponent(QuestionComponent);
        const editor = fixture.componentInstance;
        fixture.componentRef.setInput('question', question);
        editor.ngOnInit();
        editor.questionForm.addControl('questionBody', new FormGroup(body));
        editor.saveQuestion();
        return (updateQuestion$.mock.calls[0][0] as ReverseQuestion).options;
    };

    it('should keep each weighted option on its own id after a removal', () => {
        const question = {
            id: 5,
            type: 'WeightedMultipleChoiceQuestion',
            options: [option(1, 'A', 1), option(2, 'B', -1), option(3, 'C', 2)],
            questionOwners: [],
            tags: [],
        } as unknown as ReverseQuestion;
        const weighted = optionEditor(WeightedMultipleChoiceComponent, question);

        weighted.removeOption(1);
        weighted.addNewOption();
        weighted.optionsFormArray.at(2).get('optionText')?.setValue('D');

        const saved = saveWith(question, { weightedMc: weighted.weightedMcForm });
        expect(saved.map((o) => [o.id, o.option, o.defaultScore])).toEqual([
            [1, 'A', 1],
            [3, 'C', 2],
            [undefined, 'D', 0],
        ]);
    });

    it('should keep each multiple choice option on its own id after a removal', () => {
        const question = {
            id: 5,
            type: 'MultipleChoiceQuestion',
            options: [option(1, 'A', 0, false), option(2, 'B', 0, false), option(3, 'C', 1, true)],
            questionOwners: [],
            tags: [],
        } as unknown as ReverseQuestion;
        const mc = optionEditor(MultipleChoiceComponent, question);

        mc.removeOption(0);

        const saved = saveWith(question, { multipleChoice: mc.multipleChoiceForm });
        expect(saved.map((o) => [o.id, o.option, o.correctOption])).toEqual([
            [2, 'B', false],
            [3, 'C', true],
        ]);
    });

    it('should keep each exam option with its exam score after a removal', () => {
        const adapter = TestBed.inject(QuestionAdapterService);
        const examOption = (id: number, base: MultipleChoiceOption, score: number) => ({ id, option: base, score });
        const examQuestion = {
            options: [
                examOption(11, option(1, 'A', 1), 5),
                examOption(12, option(2, 'B', -1), -5),
                examOption(13, option(3, 'C', 2), 10),
            ],
        } as unknown as ExamSectionQuestion;

        const updates = adapter.formValuesToExamQuestionUpdates(
            {
                questionBody: {
                    weightedMc: {
                        options: [
                            { id: 1, optionText: 'A', defaultScore: 5 },
                            { id: 3, optionText: 'C', defaultScore: 10 },
                            { id: null, optionText: 'D', defaultScore: 0 },
                        ],
                    },
                },
            },
            examQuestion,
            {} as ReverseQuestion,
        );

        expect(updates.options?.map((o) => [o.id, o.option.id, o.option.option, o.score])).toEqual([
            [11, 1, 'A', 5],
            [13, 3, 'C', 10],
            [undefined, undefined, 'D', 0],
        ]);
    });
});
