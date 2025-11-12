// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ExamSection } from 'src/app/exam/exam.model';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { PrintedClozeTestComponent } from './printed-cloze-test.component';
import { PrintedEssayComponent } from './printed-essay.component';
import { PrintedMultiChoiceComponent } from './printed-multi-choice.component';

@Component({
    selector: 'xm-printed-section',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <blockquote>
            <h4>{{ index() + 1 }}.&nbsp; &nbsp;{{ section().name }}</h4>
        </blockquote>
        <p>{{ section().description }}</p>
        @for (sectionQuestion of section().sectionQuestions | orderBy: 'sequenceNumber'; track sectionQuestion) {
            <div class="sub-content-row col-md-12">
                @if (
                    sectionQuestion.question.type === 'MultipleChoiceQuestion' ||
                    sectionQuestion.question.type === 'WeightedMultipleChoiceQuestion' ||
                    sectionQuestion.question.type === 'ClaimChoiceQuestion'
                ) {
                    <xm-printed-multi-choice [sectionQuestion]="sectionQuestion"> </xm-printed-multi-choice>
                }
                @if (sectionQuestion.question.type === 'EssayQuestion') {
                    <xm-printed-essay [sectionQuestion]="sectionQuestion"> </xm-printed-essay>
                }
                @if (sectionQuestion.question.type === 'ClozeTestQuestion') {
                    <xm-printed-cloze-test [sectionQuestion]="sectionQuestion"> </xm-printed-cloze-test>
                }
            </div>
        }
    `,
    styleUrls: ['./print.shared.scss'],
    imports: [PrintedMultiChoiceComponent, PrintedEssayComponent, PrintedClozeTestComponent, OrderByPipe],
})
export class PrintedSectionComponent {
    section = input.required<ExamSection>();
    index = input(0);
}
