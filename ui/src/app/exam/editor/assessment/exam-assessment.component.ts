// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import { AutoEvaluationConfig, Exam, ExamFeedbackConfig, ExamType, GradeScale } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { AutoEvaluationComponent } from './auto-evaluation.component';
import { ExamFeedbackConfigComponent } from './exam-feedback-config.component';

@Component({
    selector: 'xm-exam-assessment',
    templateUrl: './exam-assessment.component.html',
    styleUrls: ['../../exam.shared.scss'],
    imports: [NgbPopover, AutoEvaluationComponent, ExamFeedbackConfigComponent, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamAssessmentComponent {
    readonly autoEvaluationRef = viewChild<AutoEvaluationComponent>('autoEvaluationComponent');

    readonly exam = signal<Exam>({} as Exam);
    readonly collaborative = signal(false);
    readonly examTypes = signal<(ExamType & { name: string })[]>([]);
    readonly gradeScaleSetting = signal({ overridable: false });
    readonly gradeScales = signal<GradeScale[]>([]);
    readonly autoEvaluation = signal({ enabled: false });
    readonly examFeedbackConfig = signal({ enabled: false });
    readonly isAllowedToUpdateFeedbackConfig = signal<'everything' | 'nothing' | 'date'>('nothing');

    private readonly destroyRef = inject(DestroyRef);
    private readonly http = inject(HttpClient);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Tabs = inject(ExamTabService);
    private readonly Exam = inject(ExamService);

    constructor() {
        this.exam.set(this.Tabs.getExam());
        this.collaborative.set(this.Tabs.isCollaborative());
        const currentExam = this.exam();
        this.http
            .get<{ overridable: boolean }>('/app/settings/gradescale')
            .subscribe((setting) => this.gradeScaleSetting.set(setting));
        this.http
            .get<{ status: 'everything' | 'nothing' | 'date' }>(`/app/review/${currentExam.id}/locked`)
            .subscribe((setting) => this.isAllowedToUpdateFeedbackConfig.set(setting.status));
        this.refreshExamTypes();
        this.refreshGradeScales();
        this.autoEvaluation.set({ enabled: !!currentExam.autoEvaluationConfig });
        this.examFeedbackConfig.set({ enabled: !!currentExam.examFeedbackConfig });
        this.Tabs.notifyTabChange(3);

        this.translate.onTranslationChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.refreshExamTypes();
            this.refreshGradeScales();
        });
    }

    setExamType(type: string) {
        const currentExam = this.exam();
        this.exam.set({ ...currentExam, examType: { ...currentExam.examType, type } });
        this.updateExam(false);
    }

    // when grade changes, delete autoeval config (locally) and call prepare
    updateExam(resetAutoEvaluationConfig: boolean) {
        const currentAutoEvaluation = this.autoEvaluation();
        const currentExam = this.exam();
        const currentExamFeedbackConfig = this.examFeedbackConfig();

        // Only sync form data if auto-evaluation is enabled
        // If disabled, we want to save with evaluationConfig: null
        const autoEvaluationComponent = this.autoEvaluationRef();
        if (autoEvaluationComponent && currentAutoEvaluation.enabled) {
            autoEvaluationComponent.save();
            // Re-read exam after save() updates it via autoEvaluationConfigChanged
            // Since signals are synchronous, the exam should be updated immediately
            const updatedExam = this.exam();
            const hasAutoEvaluationConfig = !!updatedExam.autoEvaluationConfig;

            const config = {
                evaluationConfig:
                    hasAutoEvaluationConfig && this.canBeAutoEvaluated() && !resetAutoEvaluationConfig
                        ? {
                              releaseType: updatedExam.autoEvaluationConfig?.releaseType,
                              releaseDate: updatedExam.autoEvaluationConfig?.releaseDate
                                  ? new Date(updatedExam.autoEvaluationConfig.releaseDate).getTime()
                                  : null,
                              amountDays: updatedExam.autoEvaluationConfig?.amountDays,
                              gradeEvaluations: updatedExam.autoEvaluationConfig?.gradeEvaluations,
                          }
                        : null,
                feedbackConfig:
                    currentExamFeedbackConfig.enabled && !this.collaborative()
                        ? {
                              releaseType: updatedExam.examFeedbackConfig?.releaseType,
                              releaseDate: updatedExam.examFeedbackConfig?.releaseDate
                                  ? new Date(updatedExam.examFeedbackConfig.releaseDate).getTime()
                                  : null,
                              amountDays: updatedExam.examFeedbackConfig?.amountDays,
                          }
                        : null,
            };
            const examToUpdate = resetAutoEvaluationConfig
                ? { ...updatedExam, autoEvaluationConfig: undefined }
                : updatedExam;
            this.Exam.updateExam$(examToUpdate, config, this.collaborative()).subscribe({
                next: () => {
                    this.toast.info(this.translate.instant('i18n_exam_saved'));
                    const savedExam = { ...examToUpdate };
                    const code = savedExam.course ? savedExam.course.code : null;
                    this.Tabs.notifyExamUpdate({
                        name: savedExam.name,
                        code: code,
                        scaleChange: resetAutoEvaluationConfig,
                        initScale: false,
                    });
                    let finalExam: Exam = { ...savedExam };
                    if (!currentAutoEvaluation.enabled) {
                        finalExam = { ...finalExam, autoEvaluationConfig: undefined };
                    }
                    if (!currentExamFeedbackConfig.enabled) {
                        finalExam = { ...finalExam, examFeedbackConfig: undefined };
                    }
                    this.exam.set(finalExam);
                },
                error: (err) => this.toast.error(err),
            });
            return;
        }

        // Auto-evaluation is disabled - save with evaluationConfig: null
        const config = {
            evaluationConfig: null,
            feedbackConfig:
                currentExamFeedbackConfig.enabled && !this.collaborative()
                    ? {
                          releaseType: currentExam.examFeedbackConfig?.releaseType,
                          releaseDate: currentExam.examFeedbackConfig?.releaseDate
                              ? new Date(currentExam.examFeedbackConfig.releaseDate).getTime()
                              : null,
                          amountDays: currentExam.examFeedbackConfig?.amountDays,
                      }
                    : null,
        };
        // Always remove autoEvaluationConfig when disabled
        const examToUpdate = { ...currentExam, autoEvaluationConfig: undefined };
        this.Exam.updateExam$(examToUpdate, config, this.collaborative()).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_exam_saved'));
                const updatedExam = { ...examToUpdate };
                const code = updatedExam.course ? updatedExam.course.code : null;
                this.Tabs.notifyExamUpdate({
                    name: updatedExam.name,
                    code: code,
                    scaleChange: resetAutoEvaluationConfig,
                    initScale: false,
                });
                let finalExam: Exam = { ...updatedExam };
                if (!currentAutoEvaluation.enabled) {
                    finalExam = { ...finalExam, autoEvaluationConfig: undefined };
                }
                if (!currentExamFeedbackConfig.enabled) {
                    finalExam = { ...finalExam, examFeedbackConfig: undefined };
                }
                this.exam.set(finalExam);
            },
            error: (err) => this.toast.error(err),
        });
    }

    checkScaleDisabled(scale: GradeScale) {
        const currentExam = this.exam();
        if (!scale || !currentExam.course || !currentExam.course.gradeScale) {
            return false;
        }
        return !this.gradeScaleSetting().overridable && currentExam.course.gradeScale.id === scale.id;
    }

    setScale(grading: GradeScale) {
        const currentExam = this.exam();
        this.exam.set({ ...currentExam, gradeScale: grading });
        this.updateExam(true);
    }

    getSelectableScales() {
        const currentGradeScales = this.gradeScales();
        const currentExam = this.exam();
        const currentGradeScaleSetting = this.gradeScaleSetting();
        if (!currentGradeScales || !currentExam || !currentGradeScaleSetting) {
            return [];
        }

        return currentGradeScales.filter((scale: GradeScale) => {
            if (currentGradeScaleSetting.overridable) {
                return true;
            } else if (currentExam.course && currentExam.course.gradeScale) {
                return currentExam.course.gradeScale.id === scale.id;
            } else {
                return true;
            }
        });
    }

    checkScale(scale: GradeScale) {
        const currentExam = this.exam();
        if (!currentExam.gradeScale) {
            return '';
        }
        return currentExam.gradeScale.id === scale.id ? 'btn-primary' : '';
    }

    canBeAutoEvaluated() {
        const currentExam = this.exam();
        return (
            this.Exam.hasQuestions(currentExam) &&
            !this.Exam.hasEssayQuestions(currentExam) &&
            currentExam.gradeScale &&
            currentExam.executionType.type !== 'MATURITY'
        );
    }

    autoEvaluationConfigChanged(event: { config: AutoEvaluationConfig }) {
        const currentExam = this.exam();
        this.exam.set({ ...currentExam, autoEvaluationConfig: event.config });
    }

    autoEvaluationDisabled() {
        const currentExam = this.exam();
        // Remove autoEvaluationConfig from exam immediately
        this.exam.set({ ...currentExam, autoEvaluationConfig: undefined });
        this.autoEvaluation.set({ enabled: false });
    }

    autoEvaluationEnabled() {
        this.autoEvaluation.set({ enabled: true });
    }

    feedbackConfigChanged(event: { config: ExamFeedbackConfig }) {
        const currentExam = this.exam();
        this.exam.set({ ...currentExam, examFeedbackConfig: event.config });
    }

    feedbackConfigDisabled() {
        const currentExam = this.exam();
        // Remove examFeedbackConfig from exam immediately
        this.exam.set({ ...currentExam, examFeedbackConfig: undefined });
        this.examFeedbackConfig.set({ enabled: false });
    }

    feedbackConfigEnabled() {
        this.examFeedbackConfig.set({ enabled: true });
    }

    nextTab() {
        this.Tabs.notifyTabChange(4);
        this.router.navigate(['..', '4'], { relativeTo: this.route });
    }

    previousTab() {
        this.Tabs.notifyTabChange(2);
        this.router.navigate(['..', '2'], { relativeTo: this.route });
    }

    private refreshExamTypes() {
        this.Exam.refreshExamTypes$().subscribe((types) => {
            const currentExam = this.exam();
            // Maturity can only have a FINAL type
            if (currentExam.executionType.type === 'MATURITY') {
                types = types.filter((t) => t.type === 'FINAL');
            }
            this.examTypes.set(types);
        });
    }

    private refreshGradeScales() {
        this.Exam.refreshGradeScales$(this.collaborative()).subscribe((scales: GradeScale[]) => {
            this.gradeScales.set(scales);
        });
    }

    private omitProperty<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
        const { [key]: omitted, ...rest } = obj;
        void omitted; // Explicitly mark as intentionally unused
        return rest;
    }
}
