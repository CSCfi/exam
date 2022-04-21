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
import { WindowRef } from '../../shared/window/window.service';
import type { Examination, ExaminationSection } from '../examination.model';
import { ExaminationService } from '../examination.service';

@Component({
    selector: 'examination-section',
    template: `<div class="row">
            <div class="col-md-12 studentexam-header">
                <h2>
                    <span class="exam-title">{{ index }}. {{ section.name }}</span>
                    <span *ngIf="isPreview && section.lotteryOn" class="sitnet-text-medium">
                        <small class="ml-3">({{ 'sitnet_lottery_questions' | translate }})</small>
                    </span>
                </h2>
                <div class="section-score-details">
                    <div class="section-score-label" *ngIf="getSectionMaxScore() > 0">
                        {{ 'sitnet_section_max_score' | translate }}: &nbsp; {{ getSectionMaxScore() }}
                    </div>
                    <div class="section-score-label" *ngIf="getAmountOfSelectionEvaluatedQuestions() > 0">
                        {{ 'sitnet_word_passed_max' | translate }}: &nbsp;
                        {{ getAmountOfSelectionEvaluatedQuestions() }}
                    </div>
                </div>
                <!-- DESCRIPTION FOR SECTION -->
                <div *ngIf="section.description && section.description.length > 0">
                    <img
                        src="/assets/images/icon_info.svg"
                        alt="info-icon"
                        onerror="this.onerror=null;this.src='/assets/images/icon_info.png';"
                    />
                    <span class="pl-2">{{ section.description }}</span>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-12">
                <div *ngFor="let material of section.examMaterials" class="row">
                    <div class="col-md-12 info-row mart10">
                        <i class="text-muted bi-book" alt="exam materials"></i>
                        <span style="padding-left: 15px">{{ material.name }}</span>
                        <span *ngIf="material.author"> ({{ material.author }}) </span>
                        <span *ngIf="material.isbn">
                            <small>[ISBN: {{ material.isbn }}]</small>
                        </span>
                    </div>
                </div>
                <examination-question
                    *ngFor="let sq of section.sectionQuestions | orderBy: 'sequenceNumber'"
                    [question]="sq"
                    [exam]="exam"
                    [isPreview]="isPreview"
                    [isCollaborative]="isCollaborative"
                    tabindex="0"
                ></examination-question>
            </div>
        </div> `,
})
export class ExaminationSectionComponent implements OnInit, OnDestroy {
    @Input() exam!: Examination;
    @Input() section!: ExaminationSection;
    @Input() index?: number;
    @Input() isPreview = false;
    @Input() isCollaborative = false;

    autosaver?: number;

    constructor(private Examination: ExaminationService, private Window: WindowRef) {}

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
            this.autosaver = this.Window.nativeWindow.setInterval(
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
            this.Window.nativeWindow.clearInterval(this.autosaver);
            delete this.autosaver;
        }
    };
}
