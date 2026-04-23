// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

/// <reference types="vitest/globals" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { ExamAnswersDialogComponent } from './exam-answers-dialog.component';

describe('ExamAnswersDialogComponent', () => {
    let component: ExamAnswersDialogComponent;
    let fixture: ComponentFixture<ExamAnswersDialogComponent>;

    beforeEach(async () => {
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

    it('escapes html special characters in option content', () => {
        expect(component.escapeHtml('<b>bold</b> & "quote"')).toBe('&lt;b&gt;bold&lt;/b&gt; &amp; &quot;quote&quot;');
    });

    it('renders multi-choice answer tags as visible text instead of html elements', async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const html = fixture.nativeElement as HTMLElement;
        const answerContainer = Array.from(html.querySelectorAll('.xm-study-item-container .col-md-12')).find((el) =>
            el.textContent?.includes('<b>bold</b>'),
        );

        expect(answerContainer).toBeTruthy();
        expect(answerContainer?.querySelector('b')).toBeNull();
        expect(answerContainer?.textContent).toContain('<b>bold</b> & <i>italic</i>');
    });
});


