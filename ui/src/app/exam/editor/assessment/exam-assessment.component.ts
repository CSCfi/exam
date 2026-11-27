// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
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

    readonly exam = computed(() => this.Tabs.examSignal()!);
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
        this.Tabs.setExam({ ...currentExam, examType: { ...currentExam.examType, type } });
        this.updateExam(false);
    }

    updateExam(resetAutoEvaluationConfig: boolean) {
        const autoEvaluationComponent = this.autoEvaluationRef();
        if (autoEvaluationComponent && this.autoEvaluation().enabled) {
            // Sync form data into the exam signal before saving
            autoEvaluationComponent.save();
        }
        const exam = this.exam();
        this.Tabs.saveExam$({
            evaluationConfig: this.buildEvaluationConfig(exam, resetAutoEvaluationConfig),
            feedbackConfig: this.buildFeedbackConfig(exam),
        }).subscribe();
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
        this.Tabs.setExam({ ...currentExam, gradeScale: grading });
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
        this.Tabs.setExam({ ...currentExam, autoEvaluationConfig: event.config });
    }

    autoEvaluationDisabled() {
        const currentExam = this.exam();
        // Remove autoEvaluationConfig from exam immediately
        this.Tabs.setExam({ ...currentExam, autoEvaluationConfig: undefined });
        this.autoEvaluation.set({ enabled: false });
    }

    autoEvaluationEnabled() {
        this.autoEvaluation.set({ enabled: true });
    }

    feedbackConfigChanged(event: { config: ExamFeedbackConfig }) {
        this.Tabs.setExam({ ...this.exam(), examFeedbackConfig: event.config });
    }

    feedbackConfigToggled(enabled: boolean) {
        this.examFeedbackConfig.set({ enabled });
        if (!enabled) {
            this.Tabs.setExam({ ...this.exam(), examFeedbackConfig: undefined });
        }
        this.updateExam(false);
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

    private buildEvaluationConfig(exam: Exam, reset: boolean): object | null {
        if (!this.autoEvaluation().enabled || !exam.autoEvaluationConfig || !this.canBeAutoEvaluated() || reset) {
            return null;
        }
        const cfg = exam.autoEvaluationConfig;
        return {
            releaseType: cfg.releaseType,
            releaseDate: cfg.releaseDate ? new Date(cfg.releaseDate).getTime() : null,
            amountDays: cfg.amountDays,
            gradeEvaluations: cfg.gradeEvaluations,
        };
    }

    private buildFeedbackConfig(exam: Exam): object | null {
        if (!this.examFeedbackConfig().enabled || this.collaborative()) return null;
        const cfg = exam.examFeedbackConfig;
        if (!cfg?.releaseType) return null;
        return {
            releaseType: cfg.releaseType,
            releaseDate: cfg.releaseDate ? new Date(cfg.releaseDate).getTime() : null,
            amountDays: cfg.amountDays,
        };
    }
}
