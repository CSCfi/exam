// SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

/// <reference types="vitest/globals" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionService } from 'src/app/question/question.service';
import { ClaimChoiceAnswerComponent } from './claim-choice-answer.component';

describe('ClaimChoiceAnswerComponent', () => {
    let component: ClaimChoiceAnswerComponent;
    let fixture: ComponentFixture<ClaimChoiceAnswerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ClaimChoiceAnswerComponent, TranslateModule.forRoot()],
            providers: [
                {
                    provide: QuestionService,
                    useValue: {
                        determineClaimOptionTypeForExamQuestionOption: () => 'CorrectOption',
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ClaimChoiceAnswerComponent);
        component = fixture.componentInstance;

        component.sectionQuestion = {
            options: [
                {
                    id: 1,
                    answered: true,
                    score: 1,
                    option: { id: 11, option: '<b>bold</b> & <i>italic</i>' },
                },
                {
                    id: 2,
                    answered: false,
                    score: 0,
                    option: { id: 12, option: '<script>alert(1)</script>' },
                },
            ],
        } as never;
    });

    it('renders option text as plain text instead of html elements', async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const html = fixture.nativeElement as HTMLElement;
        const optionTexts = Array.from(html.querySelectorAll('.exam-question-option-text'));

        expect(optionTexts).toHaveLength(2);
        for (const optionText of optionTexts) {
            expect(optionText.querySelector('b')).toBeNull();
            expect(optionText.querySelector('i')).toBeNull();
            expect(optionText.querySelector('script')).toBeNull();
        }

        expect(optionTexts[0].textContent).toContain('<b>bold</b> & <i>italic</i>');
        expect(optionTexts[1].textContent).toContain('<script>alert(1)</script>');
    });
});
