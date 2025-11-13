// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, NgStyle } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    effect,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { UniquenessValidator } from 'src/app/shared/validation/unique-values.directive';

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
        ReactiveFormsModule,
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
    exam = input.required<Exam>();
    enabled = output<void>();
    disabled = output<void>();
    updated = output<{ config: AutoEvaluationConfig }>();

    autoevaluation: AutoEvaluationConfigurationTemplate;
    config = signal<AutoEvaluationConfig | undefined>(undefined);
    autoevaluationDisplayVisible = signal(false);
    gradesForm: FormGroup;
    private isSyncing = false; // Guard to prevent infinite loops

    private Exam = inject(ExamService);
    private CommonExam = inject(CommonExamService);
    private cdr = inject(ChangeDetectorRef);

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

        this.gradesForm = new FormGroup({
            gradeEvaluations: new FormArray<FormGroup>([]),
            amountDays: new FormControl(0, {
                validators: [], // Validators will be set conditionally based on release type
            }),
        });

        // Add unique values validator to the FormArray
        // Check that percentage values are unique across all grade evaluations
        this.gradesForm.get('gradeEvaluations')?.setValidators(
            UniquenessValidator((item: unknown) => {
                const typedItem = item as { percentage?: number };
                const value = Number(typedItem?.percentage);
                return isNaN(value) ? null : value;
            }),
        );

        // Don't auto-sync on valueChanges - only sync when save is clicked

        effect(() => {
            const currentExam = this.exam();
            if (currentExam) {
                this.prepareAutoEvaluationConfig();
            }
        });
    }

    get gradeEvaluationsFormArray(): FormArray {
        return this.gradesForm.get('gradeEvaluations') as FormArray;
    }

    getGradeEvaluationFormGroup(index: number): FormGroup | null {
        const formArray = this.gradeEvaluationsFormArray;
        if (!formArray || index < 0 || index >= formArray.length) {
            return null;
        }
        return formArray.at(index) as FormGroup;
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
        // Update form controls disabled state
        this.updateFormControlsEnabledState();
    }

    applyFilter(type?: ReleaseType) {
        if (this.isSyncing) return;
        const currentConfig = this.config();
        if (!currentConfig) return;

        this.isSyncing = true;
        try {
            const syncedConfig = this.syncFormValuesToConfig(currentConfig);
            this.updateReleaseTypeSelection(type);
            const updatedConfig = {
                ...syncedConfig,
                releaseType: this.selectedReleaseType()?.name,
            };
            this.config.set(updatedConfig);
            this.updateAmountDaysControl();
            this.gradesForm.updateValueAndValidity();
            this.cdr.markForCheck();
        } finally {
            this.isSyncing = false;
        }
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

    calculatePointLimitFromForm(index: number) {
        const formGroup = this.getGradeEvaluationFormGroup(index);
        if (!formGroup) return 0;
        const percentageControl = formGroup.get('percentage');
        const percentage = percentageControl ? Number(percentageControl.value) : 0;
        const max = this.calculateExamMaxScore();
        if (percentage === 0 || isNaN(percentage)) {
            return 0;
        }
        const ratio = max * percentage;
        return (ratio / 100).toFixed(2);
    }

    releaseDateChanged(event: { date: Date | null }) {
        const currentConfig = this.config();
        if (!currentConfig) return;
        // Only update local config signal, don't emit to parent
        // Parent will get the update when save() is called
        this.config.set({ ...currentConfig, releaseDate: event.date });
        // Trigger change detection to update datepicker display
        this.cdr.markForCheck();
    }

    propertyChanged() {
        // Sync form to config and emit update
        this.syncFormToConfig();
    }

    save() {
        let currentConfig = this.config();
        if (!currentConfig) {
            currentConfig = this.createDefaultConfig();
            if (!currentConfig) return;
            this.config.set(currentConfig);
        }
        this.syncFormToConfig();
    }

    private updateFormControlsEnabledState() {
        const gradeEvaluationsArray = this.gradesForm.get('gradeEvaluations') as FormArray;
        gradeEvaluationsArray.controls.forEach((ctrl) => {
            const group = ctrl as FormGroup;
            const percentageControl = group.get('percentage');
            if (this.autoevaluation.enabled) {
                percentageControl?.enable({ emitEvent: false });
            } else {
                percentageControl?.disable({ emitEvent: false });
            }
        });
        // Also update amountDays control
        const amountDaysControl = this.gradesForm.get('amountDays');
        if (this.autoevaluation.enabled) {
            amountDaysControl?.enable({ emitEvent: false });
        } else {
            amountDaysControl?.disable({ emitEvent: false });
        }
    }

    private syncFormToConfig() {
        if (this.isSyncing) return;
        const currentConfig = this.config();
        if (!currentConfig) return;

        this.isSyncing = true;
        try {
            const syncedConfig = this.syncFormValuesToConfig(currentConfig);
            const updatedConfig = {
                ...syncedConfig,
                releaseType: this.selectedReleaseType()?.name || currentConfig.releaseType,
                releaseDate: currentConfig.releaseDate,
            };
            this.config.set(updatedConfig);
            this.updated.emit({ config: updatedConfig });
        } finally {
            this.isSyncing = false;
        }
    }

    private prepareAutoEvaluationConfig() {
        if (this.isSyncing) return;

        const currentExam = this.exam();
        const localConfig = this.config();
        const examConfig = currentExam.autoEvaluationConfig;

        this.autoevaluation.enabled = !!(localConfig || examConfig);

        if (!examConfig && !localConfig && currentExam.gradeScale) {
            const defaultConfig = this.createDefaultConfig();
            if (defaultConfig) {
                this.config.set(defaultConfig);
            }
        } else if (examConfig && !localConfig) {
            this.config.set(examConfig);
            const rt = this.getReleaseTypeByName(this.config()?.releaseType);
            this.applyFilter(rt);
        }

        const needsFormUpdate = examConfig && !localConfig;
        const needsFormPopulation = localConfig && this.gradeEvaluationsFormArray.length === 0;

        if (needsFormUpdate || needsFormPopulation) {
            this.updateFormArray();
        }
        this.updateAmountDaysControl();
    }

    private updateAmountDaysControl() {
        const currentConfig = this.config();
        const amountDaysControl = this.gradesForm.get('amountDays');
        if (currentConfig && amountDaysControl) {
            amountDaysControl.setValue(currentConfig.amountDays || 0, { emitEvent: false });

            // Set validators conditionally based on release type
            const releaseType = this.selectedReleaseType();
            if (releaseType?.name === 'GIVEN_AMOUNT_DAYS' && this.autoevaluation.enabled) {
                amountDaysControl.setValidators([Validators.required, Validators.min(1), Validators.max(60)]);
            } else {
                amountDaysControl.clearValidators();
            }
            amountDaysControl.updateValueAndValidity({ emitEvent: false });

            // Set disabled state based on autoevaluation.enabled
            if (!this.autoevaluation.enabled) {
                amountDaysControl.disable({ emitEvent: false });
            } else {
                amountDaysControl.enable({ emitEvent: false });
            }
        }
    }

    private updateFormArray() {
        if (this.isSyncing) return;
        const currentConfig = this.config();
        if (!currentConfig) return;

        const formArray = this.gradeEvaluationsFormArray;
        if (!this.hasStructureChanged(formArray, currentConfig)) {
            this.updateFormArrayValues(formArray, currentConfig);
            return;
        }

        this.isSyncing = true;
        try {
            const newFormGroups = this.buildFormGroups(currentConfig);
            this.replaceFormArrayControls(formArray, newFormGroups);
            this.applyUniquenessValidator(formArray);
        } finally {
            this.isSyncing = false;
        }
    }

    private getReleaseTypeByName(name?: string) {
        return this.autoevaluation.releaseTypes.find((rt) => rt.name === name);
    }

    private createDefaultConfig(): AutoEvaluationConfig | undefined {
        const currentExam = this.exam();
        if (!currentExam.gradeScale) return undefined;
        const releaseType = this.selectedReleaseType();
        return {
            releaseType: releaseType?.name || this.autoevaluation.releaseTypes[0].name,
            gradeEvaluations: currentExam.gradeScale.grades.map((g) => ({ grade: { ...g }, percentage: 0 })),
            amountDays: 0,
            releaseDate: new Date(),
        };
    }

    private syncFormValuesToConfig(config: AutoEvaluationConfig): AutoEvaluationConfig {
        const formArray = this.gradeEvaluationsFormArray;
        const formValues = formArray.value as Array<{ percentage: number; gradeId: number }>;
        const amountDaysControl = this.gradesForm.get('amountDays');
        const amountDays = amountDaysControl ? Number(amountDaysControl.value) : config.amountDays || 0;

        const updatedEvaluations = config.gradeEvaluations.map((ge) => {
            const formValue = formValues.find((fv) => fv.gradeId === ge.grade.id);
            return formValue ? { ...ge, percentage: formValue.percentage } : ge;
        });

        return { ...config, gradeEvaluations: updatedEvaluations, amountDays };
    }

    private updateReleaseTypeSelection(type?: ReleaseType) {
        this.autoevaluation.releaseTypes.forEach((rt) => (rt.filtered = false));
        if (type) type.filtered = !type.filtered;
    }

    private hasStructureChanged(formArray: FormArray, config: AutoEvaluationConfig): boolean {
        const formValues = formArray.value as Array<{ gradeId: number }>;
        const configIds = config.gradeEvaluations.map((ge) => ge.grade.id).sort();
        const formIds = formValues.map((fv) => fv.gradeId).sort();
        return configIds.length !== formIds.length || configIds.some((id, i) => id !== formIds[i]);
    }

    private updateFormArrayValues(formArray: FormArray, config: AutoEvaluationConfig) {
        config.gradeEvaluations.forEach((ge) => {
            const formGroup = formArray.controls.find(
                (ctrl) => (ctrl as FormGroup).get('gradeId')?.value === ge.grade.id,
            ) as FormGroup;
            const percentageControl = formGroup?.get('percentage');
            if (percentageControl && percentageControl.value !== ge.percentage) {
                percentageControl.setValue(ge.percentage, { emitEvent: false });
            }
        });
        formArray.updateValueAndValidity({ emitEvent: false });
    }

    private buildFormGroups(config: AutoEvaluationConfig): FormGroup[] {
        const sortedEvaluations = [...config.gradeEvaluations].sort((a, b) => {
            const nameA = a.grade.name?.toLowerCase() || '';
            const nameB = b.grade.name?.toLowerCase() || '';
            return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
        });

        return sortedEvaluations.map((ge) => {
            const percentageControl = new FormControl(ge.percentage, {
                validators: [Validators.required, Validators.min(0), Validators.max(100)],
            });
            if (!this.autoevaluation.enabled) {
                percentageControl.disable({ emitEvent: false });
            }
            return new FormGroup({
                percentage: percentageControl,
                gradeId: new FormControl(ge.grade.id),
            });
        });
    }

    private replaceFormArrayControls(formArray: FormArray, newGroups: FormGroup[]) {
        for (let i = 0; i < newGroups.length; i++) {
            if (i < formArray.length) {
                formArray.setControl(i, newGroups[i], { emitEvent: false });
            } else {
                formArray.push(newGroups[i], { emitEvent: false });
            }
        }
        while (formArray.length > newGroups.length) {
            formArray.removeAt(formArray.length - 1, { emitEvent: false });
        }
    }

    private applyUniquenessValidator(formArray: FormArray) {
        formArray.setValidators(
            UniquenessValidator((item: unknown) => {
                const typedItem = item as { percentage?: number };
                const value = Number(typedItem?.percentage);
                return isNaN(value) ? null : value;
            }),
        );
        formArray.updateValueAndValidity({ emitEvent: false });
    }
}
