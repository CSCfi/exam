// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import { AutoEvaluationConfig, Exam, ExamFeedbackConfig, ExamType, GradeScale } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { AutoEvaluationComponent } from './auto-evaluation.component';
import { ExamFeedbackConfigComponent } from './exam-feedback-config.component';

@Component({
    selector: 'xm-exam-assessment',
    templateUrl: './exam-assessment.component.html',
    styleUrls: ['../../exam.shared.scss'],
    imports: [NgbPopover, NgClass, AutoEvaluationComponent, ExamFeedbackConfigComponent, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamAssessmentComponent implements OnDestroy {
    exam = signal<Exam>({} as Exam);
    collaborative = signal(false);

    examTypes = signal<(ExamType & { name: string })[]>([]);
    gradeScaleSetting = signal({ overridable: false });
    gradeScales = signal<GradeScale[]>([]);
    autoEvaluation = signal({ enabled: false });
    examFeedbackConfig = signal({ enabled: false });
    isAllowedToUpdateFeedbackConfig = signal<'everything' | 'nothing' | 'date'>('nothing');

    unsubscribe = new Subject<unknown>();

    private http = inject(HttpClient);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Tabs = inject(ExamTabService);
    private Exam = inject(ExamService);

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

        this.translate.onTranslationChange.pipe(takeUntil(this.unsubscribe)).subscribe(() => {
            this.refreshExamTypes();
            this.refreshGradeScales();
        });
    }

    ngOnDestroy() {
        this.unsubscribe.next(undefined);
        this.unsubscribe.complete();
    }

    checkExamType(type: string) {
        return this.exam().examType.type === type ? 'btn-primary' : '';
    }

    setExamType(type: string) {
        const currentExam = this.exam();
        this.exam.set({ ...currentExam, examType: { ...currentExam.examType, type } });
        this.updateExam(false);
    }

    // when grade changes, delete autoeval config (locally) and call prepare

    updateExam(resetAutoEvaluationConfig: boolean) {
        const currentExam = this.exam();
        const currentAutoEvaluation = this.autoEvaluation();
        const currentExamFeedbackConfig = this.examFeedbackConfig();
        const config = {
            evaluationConfig:
                currentAutoEvaluation.enabled && this.canBeAutoEvaluated() && !resetAutoEvaluationConfig
                    ? {
                          releaseType: currentExam.autoEvaluationConfig?.releaseType,
                          releaseDate: currentExam.autoEvaluationConfig?.releaseDate
                              ? new Date(currentExam.autoEvaluationConfig.releaseDate).getTime()
                              : null,
                          amountDays: currentExam.autoEvaluationConfig?.amountDays,
                          gradeEvaluations: currentExam.autoEvaluationConfig?.gradeEvaluations,
                      }
                    : null,
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
        const examToUpdate = resetAutoEvaluationConfig
            ? { ...currentExam, autoEvaluationConfig: undefined }
            : currentExam;
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
                let finalExam = { ...updatedExam };
                if (!currentAutoEvaluation.enabled) {
                    finalExam = this.omitProperty(finalExam, 'autoEvaluationConfig') as Exam;
                }
                if (!currentExamFeedbackConfig.enabled) {
                    finalExam = this.omitProperty(finalExam, 'examFeedbackConfig') as Exam;
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
