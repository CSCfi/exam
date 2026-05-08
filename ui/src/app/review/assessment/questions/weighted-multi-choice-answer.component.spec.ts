// SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

/// <reference types="vitest/globals" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { WeightedMultiChoiceAnswerComponent } from './weighted-multi-choice-answer.component';

describe('WeightedMultiChoiceAnswerComponent', () => {
    let component: WeightedMultiChoiceAnswerComponent;
    let fixture: ComponentFixture<WeightedMultiChoiceAnswerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WeightedMultiChoiceAnswerComponent, TranslateModule.forRoot()],
        }).compileComponents();

        fixture = TestBed.createComponent(WeightedMultiChoiceAnswerComponent);
        component = fixture.componentInstance;

        component.sectionQuestion = {
            options: [
                {
                    id: 1,
                    answered: true,
                    score: 2,
                    option: { id: 11, option: 'Plain option text' },
                },
                {
                    id: 2,
                    answered: false,
                    score: -1,
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
        expect(optionTexts[0].textContent).toContain('Plain option text');
        expect(optionTexts[1].querySelector('script')).toBeNull();
        expect(optionTexts[1].querySelector('b')).toBeNull();
        expect(optionTexts[1].querySelector('i')).toBeNull();
        expect(optionTexts[1].textContent).toContain('<script>alert(1)</script>');
    });
});

