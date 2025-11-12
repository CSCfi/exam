// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
    NgbCollapse,
    NgbDropdown,
    NgbDropdownItem,
    NgbDropdownMenu,
    NgbDropdownToggle,
    NgbPopover,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { AutoEvaluationConfig, Exam, Grade, GradeEvaluation } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { UniqueValuesValidatorDirective } from 'src/app/shared/validation/unique-values.directive';

type ReleaseType = { name: string; translation: string; filtered?: boolean };

type AutoEvaluationConfigurationTemplate = {
    enabled: boolean;
    releaseTypes: ReleaseType[];
};

@Component({
    selector: 'xm-auto-evaluation',
    templateUrl: './auto-evaluation.component.html',
    styleUrls: ['./auto-evaluation.component.scss'],
    imports: [
        NgbPopover,
        NgbCollapse,
        NgStyle,
        FormsModule,
        UniqueValuesValidatorDirective,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgClass,
        NgbDropdownItem,
        DatePickerComponent,
        TranslateModule,
        OrderByPipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoEvaluationComponent {
    @ViewChild('gradesForm', { static: false }) gradesForm?: NgForm;

    exam = input.required<Exam>();
    enabled = output<void>();
    disabled = output<void>();
    updated = output<{ config: AutoEvaluationConfig }>();

    autoevaluation: AutoEvaluationConfigurationTemplate;
    config = signal<AutoEvaluationConfig | undefined>(undefined);
    autoevaluationDisplayVisible = signal(false);

    private Exam = inject(ExamService);
    private CommonExam = inject(CommonExamService);

    constructor() {
        this.autoevaluation = {
            enabled: false,
            releaseTypes: [
                {
                    name: 'IMMEDIATE',
                    translation: 'i18n_release_type_immediate',
                    filtered: true,
                },
                { name: 'GIVEN_DATE', translation: 'i18n_release_type_given_date' },
                { name: 'GIVEN_AMOUNT_DAYS', translation: 'i18n_release_type_given_days' },
                { name: 'AFTER_EXAM_PERIOD', translation: 'i18n_release_type_period' },
                { name: 'NEVER', translation: 'i18n_release_type_never' },
            ],
        };

        effect(() => {
            const currentExam = this.exam();
            if (currentExam) {
                this.prepareAutoEvaluationConfig();
            }
        });
    }

    disable() {
        this.disabled.emit();
    }

    enable() {
        this.enabled.emit();
    }

    toggleDisplay() {
        this.autoevaluationDisplayVisible.update((v) => !v);
    }

    toggleEnabled() {
        this.autoevaluation.enabled = !this.autoevaluation.enabled;
        if (this.autoevaluation.enabled) {
            this.enable();
        } else {
            this.disable();
        }
    }

    applyFilter(type?: ReleaseType) {
        const currentConfig = this.config();
        if (!currentConfig) return;
        this.autoevaluation.releaseTypes.forEach((rt) => (rt.filtered = false));
        if (type) {
            type.filtered = !type.filtered;
        }
        const rt = this.selectedReleaseType();
        currentConfig.releaseType = rt ? rt.name : undefined;
        this.config.set({ ...currentConfig });
        this.updated.emit({ config: currentConfig });
    }

    selectedReleaseType() {
        return this.autoevaluation.releaseTypes.find((rt) => rt.filtered);
    }

    calculateExamMaxScore() {
        return this.Exam.getMaxScore(this.exam());
    }

    getGradeDisplayName(grade: Grade) {
        return this.CommonExam.getExamGradeDisplayName(grade.name);
    }

    calculatePointLimit(evaluation: GradeEvaluation) {
        const max = this.calculateExamMaxScore();
        if (evaluation.percentage === 0 || isNaN(evaluation.percentage)) {
            return 0;
        }
        const ratio = max * evaluation.percentage;
        return (ratio / 100).toFixed(2);
    }

    releaseDateChanged(event: { date: Date | null }) {
        const currentConfig = this.config();
        if (!currentConfig) return;
        currentConfig.releaseDate = event.date;
        this.config.set({ ...currentConfig });
        this.updated.emit({ config: currentConfig });
    }

    propertyChanged() {
        const currentConfig = this.config();
        if (currentConfig && this.gradesForm?.valid) {
            // Create a new object reference to trigger change detection
            this.config.set({ ...currentConfig });
            this.updated.emit({ config: currentConfig });
        }
    }

    updateAmountDays(value: number) {
        const currentConfig = this.config();
        if (currentConfig) {
            this.config.set({ ...currentConfig, amountDays: value });
            this.updated.emit({ config: { ...currentConfig, amountDays: value } });
        }
    }

    updateGradePercentage(gradeEvaluation: GradeEvaluation, percentage: number) {
        const currentConfig = this.config();
        if (currentConfig) {
            const updatedEvaluations = currentConfig.gradeEvaluations.map((ge) =>
                ge === gradeEvaluation ? { ...ge, percentage } : ge,
            );
            const updatedConfig = { ...currentConfig, gradeEvaluations: updatedEvaluations };
            this.config.set(updatedConfig);
            this.updated.emit({ config: updatedConfig });
        }
    }

    private prepareAutoEvaluationConfig() {
        const currentExam = this.exam();
        this.autoevaluation.enabled = !!currentExam.autoEvaluationConfig;
        if (!currentExam.autoEvaluationConfig && currentExam.gradeScale) {
            const releaseType = this.selectedReleaseType();
            this.config.set({
                releaseType: releaseType ? releaseType.name : this.autoevaluation.releaseTypes[0].name,
                gradeEvaluations: currentExam.gradeScale.grades.map((g) => ({ grade: { ...g }, percentage: 0 })),
                amountDays: 0,
                releaseDate: new Date(),
            });
        }
        if (currentExam.autoEvaluationConfig) {
            this.config.set(currentExam.autoEvaluationConfig);
            const currentConfig = this.config();
            if (currentConfig) {
                const rt = this.getReleaseTypeByName(currentConfig.releaseType);
                this.applyFilter(rt);
            }
        }
    }

    private getReleaseTypeByName(name?: string) {
        return this.autoevaluation.releaseTypes.find((rt) => rt.name === name);
    }
}
