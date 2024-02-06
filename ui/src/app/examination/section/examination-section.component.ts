/*
 * Copyright (c) 2017 Exam Consortium
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

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { OrderByPipe } from '../../shared/sorting/order-by.pipe';
import type { Examination, ExaminationSection } from '../examination.model';
import { ExaminationService } from '../examination.service';
import { ExaminationQuestionComponent } from '../question/examination-question.component';

@Component({
    selector: 'xm-examination-section',
    template: `<div class="row">
            <div class="col-md-12 studentexam-header">
                <h2
                    aria-live="polite"
                    attr.aria-label="{{ 'i18n_exam_section' | translate }} {{ index ? index + '. ' : '' }}{{
                        section.name
                    }}"
                    id="examination-section"
                >
                    <span class="exam-title">{{ index ? index + '. ' : '' }}{{ section.name }}</span>
                    @if (isPreview && section.lotteryOn) {
                        <span class="sitnet-text-medium">
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
                @if (section.description && section.description.length > 0) {
                    <div>
                        <img src="/assets/images/icon_info.svg" alt="" />
                        <span class="ps-2">{{ section.description }}</span>
                    </div>
                }
            </div>
        </div>
    <!-- Question Content -->
        <div class="row">
            <div class="col-md-12">
                @for (material of section.examMaterials; track material) {
                    <div class="row">
                        <div class="col-md-12 info-row mart10">
                            <i class="text-muted bi-book" alt="exam materials"></i>
                            <span style="padding-left: 15px">{{ material.name }}</span>
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
                @for (sq of section.sectionQuestions | orderBy: 'sequenceNumber'; track sq) {
                    <xm-examination-question
                        [question]="sq"
                        [exam]="exam"
                        [isPreview]="isPreview"
                        [isCollaborative]="isCollaborative"
                    ></xm-examination-question>
                }
            </div>
        </div>`,
    standalone: true,
    imports: [ExaminationQuestionComponent, TranslateModule, OrderByPipe],
})
export class ExaminationSectionComponent implements OnInit, OnDestroy {
    @Input() exam!: Examination;
    @Input() section!: ExaminationSection;
    @Input() index?: number;
    @Input() isPreview = false;
    @Input() isCollaborative = false;

    autosaver?: number;

    constructor(private Examination: ExaminationService) {}

    ngOnInit() {
        this.resetAutosaver();
    }

    ngOnDestroy() {
        this.cancelAutosaver();
    }

    getSectionMaxScore = () => this.Examination.getSectionMaxScore(this.section);

    getAmountOfSelectionEvaluatedQuestions = () =>
        this.section.sectionQuestions.filter((esq) => esq.evaluationType === 'Selection').length;

    private resetAutosaver = () => {
        this.cancelAutosaver();
        if (this.section && !this.isPreview) {
            this.autosaver = window.setInterval(
                () =>
                    this.Examination.saveAllTextualAnswersOfSection$(
                        this.section,
                        this.exam.hash,
                        true,
                        false,
                        false,
                    ).subscribe(),
                1000 * 60,
            );
        }
    };

    private cancelAutosaver = () => {
        if (this.autosaver) {
            window.clearInterval(this.autosaver);
            delete this.autosaver;
        }
    };
}
