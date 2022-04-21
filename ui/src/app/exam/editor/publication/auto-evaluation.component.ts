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
import type { OnInit, SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { cloneDeep } from 'lodash';
import { CommonExamService } from '../../../shared/miscellaneous/common-exam.service';
import type { AutoEvaluationConfig, Exam, Grade, GradeEvaluation } from '../../exam.model';
import { ExamService } from '../../exam.service';

type ReleaseType = { name: string; translation: string; filtered?: boolean };

type AutoEvaluationConfigurationTemplate = {
    enabled: boolean;
    releaseTypes: ReleaseType[];
};

@Component({
    selector: 'xm-auto-evaluation',
    templateUrl: './auto-evaluation.component.html',
})
export class AutoEvaluationComponent implements OnInit {
    @Input() exam!: Exam;
    @Output() enabled = new EventEmitter<void>();
    @Output() disabled = new EventEmitter<void>();
    @Output() updated = new EventEmitter<{ config: AutoEvaluationConfig }>();
    @ViewChild('gradesForm', { static: false }) gradesForm?: NgForm;

    autoevaluation: AutoEvaluationConfigurationTemplate;
    config?: AutoEvaluationConfig;
    autoevaluationDisplay: { visible: boolean };

    constructor(private Exam: ExamService, private CommonExam: CommonExamService) {
        this.autoevaluation = {
            enabled: false,
            releaseTypes: [
                {
                    name: 'IMMEDIATE',
                    translation: 'sitnet_autoevaluation_release_type_immediate',
                    filtered: true,
                },
                { name: 'GIVEN_DATE', translation: 'sitnet_autoevaluation_release_type_given_date' },
                { name: 'GIVEN_AMOUNT_DAYS', translation: 'sitnet_autoevaluation_release_type_given_days' },
                { name: 'AFTER_EXAM_PERIOD', translation: 'sitnet_autoevaluation_release_type_period' },
                { name: 'NEVER', translation: 'sitnet_autoevaluation_release_type_never' },
            ],
        };
        this.autoevaluationDisplay = { visible: false };
    }

    ngOnInit() {
        this.prepareAutoEvaluationConfig();
    }

    ngOnChanges = (props: SimpleChanges) => {
        if (props.exam && this.autoevaluation) {
            this.prepareAutoEvaluationConfig();
        }
    };

    disable = () => this.disabled.emit();
    enable = () => this.enabled.emit();

    applyFilter = (type?: ReleaseType) => {
        if (!this.config) return;
        this.autoevaluation.releaseTypes.forEach((rt) => (rt.filtered = false));
        if (type) {
            type.filtered = !type.filtered;
        }
        const rt = this.selectedReleaseType();
        this.config.releaseType = rt ? rt.name : undefined;
        this.updated.emit({ config: this.config });
    };

    selectedReleaseType = () => this.autoevaluation.releaseTypes.find((rt) => rt.filtered);

    calculateExamMaxScore = () => this.Exam.getMaxScore(this.exam);

    getGradeDisplayName = (grade: Grade) => this.CommonExam.getExamGradeDisplayName(grade.name);

    calculatePointLimit = (evaluation: GradeEvaluation) => {
        const max = this.calculateExamMaxScore();
        if (evaluation.percentage === 0 || isNaN(evaluation.percentage)) {
            return 0;
        }
        const ratio = max * evaluation.percentage;
        return (ratio / 100).toFixed(2);
    };

    releaseDateChanged = (event: { date: Date | null }) => {
        if (!this.config) return;
        this.config.releaseDate = event.date;
        this.updated.emit({ config: this.config });
    };

    propertyChanged = () => {
        if (this.config && this.gradesForm?.valid) this.updated.emit({ config: this.config });
    };

    private prepareAutoEvaluationConfig = () => {
        this.autoevaluation.enabled = !!this.exam.autoEvaluationConfig;
        if (!this.exam.autoEvaluationConfig && this.exam.gradeScale) {
            const releaseType = this.selectedReleaseType();
            this.config = {
                releaseType: releaseType ? releaseType.name : this.autoevaluation.releaseTypes[0].name,
                gradeEvaluations: this.exam.gradeScale.grades.map((g) => ({ grade: cloneDeep(g), percentage: 0 })),
                amountDays: 0,
                releaseDate: new Date(),
            };
        }
        if (this.exam.autoEvaluationConfig) {
            this.config = this.exam.autoEvaluationConfig;
            const rt = this.getReleaseTypeByName(this.config.releaseType);
            this.applyFilter(rt);
        }
    };

    private getReleaseTypeByName = (name?: string) => this.autoevaluation.releaseTypes.find((rt) => rt.name === name);
}
