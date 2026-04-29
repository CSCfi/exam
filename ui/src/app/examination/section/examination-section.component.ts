// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { Examination, ExaminationSection } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';
import { ExaminationQuestionComponent } from 'src/app/examination/question/examination-question.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-examination-section',
    template: `<div class="row mt-3 ms-1">
            <div class="col-md-12">
                <h2
                    aria-live="polite"
                    [ariaLabel]="
                        ('i18n_exam_section' | translate) + ' ' + (index() ? index() + '. ' : '') + section().name
                    "
                    id="examination-section"
                >
                    <span class="exam-title">{{ index() ? index() + '. ' : '' }}{{ section().name }}</span>
                    @if (isPreview() && section().lotteryOn) {
                        <span class="text-black">
                            <small class="ms-3">({{ 'i18n_lottery_questions' | translate }})</small>
                        </span>
                    }
                </h2>
                <div class="section-score-details">
                    @if (getSectionMaxScore() > 0) {
                        <div class="section-score-label">
                            {{ 'i18n_section_max_score' | translate }}: &nbsp; {{ getSectionMaxScore() }}
                        </div>
                    }
                    @if (getAmountOfSelectionEvaluatedQuestions() > 0) {
                        <div class="section-score-label">
                            {{ 'i18n_word_passed_max' | translate }}: &nbsp;
                            {{ getAmountOfSelectionEvaluatedQuestions() }}
                        </div>
                    }
                </div>
                <!-- DESCRIPTION FOR SECTION -->
                @if (section().description && section().description.length > 0) {
                    <img src="/assets/images/icon_info.svg" alt="" />
                    <span class="ps-2">{{ section().description }}</span>
                }
            </div>
        </div>
        <!-- Question Content -->
        <div class="row ms-1">
            <div class="col-md-12">
                @for (material of section().examMaterials; track material) {
                    <div class="row">
                        <div class="col-md-12 mt-1">
                            <i class="text-muted bi-book" alt="exam materials"></i>
                            <span class="ps-3">{{ material.name }}</span>
                            @if (material.author) {
                                <span> ({{ material.author }}) </span>
                            }
                            @if (material.isbn) {
                                <span>
                                    <small>[ISBN: {{ material.isbn }}]</small>
                                </span>
                            }
                        </div>
                    </div>
                }
                @for (sq of section().sectionQuestions | orderBy: 'sequenceNumber'; track sq) {
                    <xm-examination-question
                        [question]="sq"
                        [exam]="exam()"
                        [isPreview]="isPreview()"
                        [isCollaborative]="isCollaborative()"
                    ></xm-examination-question>
                }
            </div>
        </div>`,
    imports: [ExaminationQuestionComponent, TranslateModule, OrderByPipe],
    styleUrls: ['../examination.shared.scss', './examination-section.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationSectionComponent {
    readonly exam = input.required<Examination>();
    readonly section = input.required<ExaminationSection>();
    readonly index = input<number | undefined>(undefined);
    readonly isPreview = input(false);
    readonly isCollaborative = input(false);

    private readonly Examination = inject(ExaminationService);

    getSectionMaxScore() {
        return this.Examination.getSectionMaxScore(this.section());
    }

    getAmountOfSelectionEvaluatedQuestions() {
        return this.section().sectionQuestions.filter((esq) => esq.evaluationType === 'Selection').length;
    }
}
