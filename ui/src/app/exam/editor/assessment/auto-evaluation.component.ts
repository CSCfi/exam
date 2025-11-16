// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { startWith } from 'rxjs';
import type { AutoEvaluationConfig, Exam, Grade, GradeEvaluation } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { UniquenessValidator } from 'src/app/shared/validation/unique-values.directive';

type ReleaseType = { name: string; translation: string };

@Component({
    selector: 'xm-auto-evaluation',
    templateUrl: './auto-evaluation.component.html',
    styleUrls: ['./auto-evaluation.component.scss'],
    imports: [
        NgClass,
        NgStyle,
        NgbPopover,
        NgbCollapse,
        ReactiveFormsModule,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        DatePickerComponent,
        TranslateModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoEvaluationComponent {
    exam = input.required<Exam>();
    enabled = output<void>();
    disabled = output<void>();
    updated = output<{ config: AutoEvaluationConfig }>();

    panelOpen = signal(false);

    releaseTypes: ReleaseType[] = [
        { name: 'IMMEDIATE', translation: 'i18n_release_type_immediate' },
        { name: 'GIVEN_DATE', translation: 'i18n_release_type_given_date' },
        { name: 'GIVEN_AMOUNT_DAYS', translation: 'i18n_release_type_given_days' },
        { name: 'AFTER_EXAM_PERIOD', translation: 'i18n_release_type_period' },
        { name: 'NEVER', translation: 'i18n_release_type_never' },
    ];
    form = new FormGroup({
        gradeEvaluations: new FormArray<FormGroup>([]),
        amountDays: new FormControl(0),
        releaseDate: new FormControl<Date | null>(null),
        releaseType: new FormControl<string>('IMMEDIATE'), // Form is source of truth
    });

    // Computed signal derived from form
    selectedReleaseType = computed(() => {
        const releaseTypeName = this.releaseTypeValue();
        return this.releaseTypes.find((rt) => rt.name === releaseTypeName) ?? this.releaseTypes[0];
    });
    releaseTypeValue = toSignal(
        this.form.get('releaseType')!.valueChanges.pipe(startWith(this.form.get('releaseType')!.value ?? 'IMMEDIATE')),
        { initialValue: 'IMMEDIATE' },
    );

    // Signal to track form's releaseType value changes (needed for computed to react)
    //private releaseTypeValue = signal<string>('IMMEDIATE');

    private Exam = inject(ExamService);
    private CommonExam = inject(CommonExamService);

    // Track if form has been initialized to prevent overwriting user changes
    private formInitialized = false;

    constructor() {
        // Subscribe to form's releaseType valueChanges to update signal (for computed reactivity)
        effect(() => {
            const exam = this.exam();
            if (!exam) return;
            const config = exam.autoEvaluationConfig ?? this.createDefaultConfig(exam);

            // Only initialize form on first load or when exam ID changes
            // This prevents overwriting user changes when exam signal updates
            const shouldInitialize = !this.formInitialized;

            if (shouldInitialize) {
                // populate form
                this.buildGradeArray(config);
                const releaseType = config.releaseType || 'IMMEDIATE';
                // Patch releaseType separately with emitEvent: true so subscription handles signal update
                this.form.get('releaseType')?.patchValue(releaseType, { emitEvent: true });
                // Patch other fields with emitEvent: false to avoid unnecessary emissions
                this.form.patchValue(
                    {
                        amountDays: config.amountDays ?? 0,
                        releaseDate: config.releaseDate ?? null,
                    },
                    { emitEvent: false },
                );

                this.updateValidators();
                this.formInitialized = true;
            }
        });
    }

    get gradeArray(): FormArray<FormGroup> {
        return this.form.get('gradeEvaluations') as FormArray<FormGroup>;
    }

    togglePanel() {
        this.panelOpen.update((v) => !v);
    }

    toggleEnabled() {
        const currentExam = this.exam();
        const isEnabled = !currentExam.autoEvaluationConfig;

        if (isEnabled) {
            // Create default config and emit it
            const defaultConfig = this.createDefaultConfig(currentExam);
            this.updated.emit({ config: defaultConfig });
            this.enabled.emit();
        } else {
            // Disable - parent will handle removing the config
            this.disabled.emit();
        }
    }

    selectReleaseType(rt: ReleaseType) {
        // Update form - use emitEvent: true for releaseType so subscription handles signal update
        this.form.get('releaseType')?.patchValue(rt.name, { emitEvent: true });
        this.updateValidators();
    }

    save() {
        const exam = this.exam();
        const raw = this.form.getRawValue();

        const config: AutoEvaluationConfig = {
            releaseType: raw.releaseType || 'IMMEDIATE',
            amountDays: Number(raw.amountDays ?? 0),
            releaseDate: raw.releaseDate ?? null,

            gradeEvaluations: (raw.gradeEvaluations as Array<{ gradeId: number; percentage: number }>).map((row) => {
                const grade = exam.gradeScale!.grades.find((g) => g.id === row.gradeId)!;
                return {
                    grade,
                    percentage: Number(row.percentage),
                };
            }),
        };

        this.updated.emit({ config: config });
    }

    maxScore() {
        return this.Exam.getMaxScore(this.exam());
    }

    displayGrade(grade: Grade) {
        return this.CommonExam.getExamGradeDisplayName(grade.name);
    }

    scoreLimit(ev: GradeEvaluation | number) {
        const pct = typeof ev === 'number' ? ev : ev.percentage;
        const max = this.maxScore();
        return ((max * pct) / 100).toFixed(2);
    }

    getGradeFromForm(index: number): Grade | undefined {
        const formGroup = this.gradeArray.at(index);
        if (!formGroup) return undefined;
        const gradeId = formGroup.get('gradeId')?.value;
        if (!gradeId) return undefined;
        return this.exam().gradeScale?.grades.find((g) => g.id === gradeId);
    }

    getPercentageFromForm(index: number): number {
        const formGroup = this.gradeArray.at(index);
        return formGroup?.get('percentage')?.value ?? 0;
    }

    releaseDateChanged(event: { date: Date | null }) {
        this.form.patchValue({ releaseDate: event.date }, { emitEvent: false });
    }

    getReleaseDate(): Date | null {
        return this.form.get('releaseDate')?.value ?? null;
    }

    private createDefaultConfig(exam: Exam): AutoEvaluationConfig {
        return {
            releaseType: this.releaseTypes[0].name,
            gradeEvaluations: exam.gradeScale!.grades.map((g) => ({
                grade: { ...g },
                percentage: 0,
            })),
            amountDays: 0,
            releaseDate: new Date(),
        };
    }

    private buildGradeArray(cfg: AutoEvaluationConfig) {
        const arr = this.gradeArray;
        arr.clear({ emitEvent: false });

        cfg.gradeEvaluations
            .sort((a, b) => a.grade.name.localeCompare(b.grade.name))
            .forEach((ge) => {
                arr.push(
                    new FormGroup({
                        gradeId: new FormControl(ge.grade.id),
                        percentage: new FormControl(ge.percentage, [
                            Validators.required,
                            Validators.min(0),
                            Validators.max(100),
                        ]),
                    }),
                    { emitEvent: false },
                );
            });

        arr.setValidators(
            UniquenessValidator((row) => {
                const p = Number((row as { percentage?: number }).percentage);
                return isNaN(p) ? null : p;
            }),
        );
    }

    private updateValidators() {
        const releaseTypeName = this.form.get('releaseType')?.value || 'IMMEDIATE';
        const amount = this.form.get('amountDays')!;

        if (releaseTypeName === 'GIVEN_AMOUNT_DAYS') {
            amount.setValidators([Validators.required, Validators.min(1), Validators.max(60)]);
        } else {
            amount.clearValidators();
        }

        amount.updateValueAndValidity({ emitEvent: false });
    }
}
