// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

/// <reference types="vitest/globals" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { ExamAnswersDialogComponent } from './exam-answers-dialog.component';
import { Directive, HostBinding, Input } from '@angular/core';

@Directive({
    selector: '[xmMathJax]',
    standalone: true,
})
class MockMathJaxDirective {
    @HostBinding('innerHTML') renderedText = '';

    @Input() set xmMathJax(value: string | null | undefined) {
        this.renderedText = value ?? '';
    }
}

describe('ExamAnswersDialogComponent', () => {
    let component: ExamAnswersDialogComponent;
    let fixture: ComponentFixture<ExamAnswersDialogComponent>;

    beforeEach(async () => {
        TestBed.overrideComponent(ExamAnswersDialogComponent, {
            remove: { imports: [MathJaxDirective] },
            add: { imports: [MockMathJaxDirective] },
        });

        await TestBed.configureTestingModule({
            imports: [ExamAnswersDialogComponent, TranslateModule.forRoot()],
            providers: [
                { provide: NgbActiveModal, useValue: { close: () => {} } },
                {
                    provide: AttachmentService,
                    useValue: { downloadQuestionAnswerAttachment: () => {} },
                },
                {
                    provide: CommonExamService,
                    useValue: {
                        countWords: () => 0,
                        countCharacters: () => 0,
                        getExamGradeDisplayName: (grade: string) => grade,
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ExamAnswersDialogComponent);
        component = fixture.componentInstance;

        component.exam = {
            course: null,
            name: 'Test exam',
            instruction: '',
            examSections: [
                {
                    name: 'Section 1',
                    sequenceNumber: 1,
                    sectionQuestions: [
                        {
                            question: { type: 'MultipleChoiceQuestion', question: 'Question text' },
                            options: [{ answered: true, option: { option: '<b>bold</b> & <i>italic</i>' } }],
                            derivedAssessedScore: 1,
                            derivedMaxScore: 1,
                        },
                    ],
                },
            ],
            totalScore: 1,
            maxScore: 1,
        } as never;
    });

    it('renders multi-choice answer tags as visible text instead of html elements', async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const html = fixture.nativeElement as HTMLElement;
        const answerContainer = html.querySelector('.xm-study-item-container .col-md-12') as HTMLElement;

        expect(answerContainer).toBeTruthy();
        expect(answerContainer?.querySelector('b')).toBeNull();
        expect(answerContainer?.textContent).toContain('<b>bold</b> & <i>italic</i>');
    });
});


