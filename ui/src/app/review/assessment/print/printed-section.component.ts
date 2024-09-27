/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import { Component, Input } from '@angular/core';
import type { ExamSection } from 'src/app/exam/exam.model';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { PrintedClozeTestComponent } from './printed-cloze-test.component';
import { PrintedEssayComponent } from './printed-essay.component';
import { PrintedMultiChoiceComponent } from './printed-multi-choice.component';

@Component({
    selector: 'xm-printed-section',
    template: `
        <blockquote>
            <h4>{{ index + 1 }}.&nbsp; &nbsp;{{ section.name }}</h4>
        </blockquote>
        <p>{{ section.description }}</p>
        @for (sectionQuestion of section.sectionQuestions | orderBy: 'sequenceNumber'; track sectionQuestion) {
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
    standalone: true,
    imports: [PrintedMultiChoiceComponent, PrintedEssayComponent, PrintedClozeTestComponent, OrderByPipe],
})
export class PrintedSectionComponent {
    @Input() section!: ExamSection;
    @Input() index = 0;
}
