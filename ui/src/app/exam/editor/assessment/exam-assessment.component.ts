import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
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
@Component({
    selector: 'xm-exam-assessment',
    templateUrl: './exam-assessment.component.html',
    styleUrls: ['../../exam.shared.scss'],
    standalone: true,
    imports: [NgbPopover, NgClass, AutoEvaluationComponent, ExamFeedbackConfigComponent, TranslateModule],
})
export class ExamAssessmentComponent implements OnInit, OnDestroy {
    exam!: Exam;
    collaborative = false;

    examTypes: (ExamType & { name: string })[] = [];
    gradeScaleSetting = { overridable: false };
    gradeScales: GradeScale[] = [];
    autoEvaluation: { enabled: boolean } = { enabled: false };
    examFeedbackConfig: { enabled: boolean } = { enabled: false };
    isAllowedToUpdateFeedbackConfig: 'everything' | 'nothing' | 'date' = 'nothing';

    unsubscribe = new Subject<unknown>();

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        private router: Router,
        private translate: TranslateService,
        private toast: ToastrService,
        private Tabs: ExamTabService,
        private Exam: ExamService,
    ) {
        this.translate.onTranslationChange.pipe(takeUntil(this.unsubscribe)).subscribe(() => {
            this.refreshExamTypes();
            this.refreshGradeScales();
        });
    }

    ngOnInit() {
        this.exam = this.Tabs.getExam();
        this.collaborative = this.Tabs.isCollaborative();
        this.http
            .get<{ overridable: boolean }>('/app/settings/gradescale')
            .subscribe((setting) => (this.gradeScaleSetting = setting));
        this.http
            .get<{ status: 'everything' | 'nothing' | 'date' }>(`/app/review/${this.exam.id}/locked`)
            .subscribe((setting) => (this.isAllowedToUpdateFeedbackConfig = setting.status));
        this.refreshExamTypes();
        this.refreshGradeScales();
        this.autoEvaluation = { enabled: !!this.exam.autoEvaluationConfig };
        this.examFeedbackConfig = { enabled: !!this.exam.examFeedbackConfig };
        this.Tabs.notifyTabChange(3);
    }

    ngOnDestroy() {
        this.unsubscribe.next(undefined);
        this.unsubscribe.complete();
    }

    checkExamType = (type: string) => (this.exam.examType.type === type ? 'btn-primary' : '');

    setExamType = (type: string) => {
        this.exam.examType.type = type;
        this.updateExam(false);
    };

    // when grade changes, delete autoeval config (locally) and call prepare

    updateExam = (resetAutoEvaluationConfig: boolean) => {
        const config = {
            evaluationConfig:
                this.autoEvaluation.enabled && this.canBeAutoEvaluated() && !resetAutoEvaluationConfig
                    ? {
                          releaseType: this.exam.autoEvaluationConfig?.releaseType,
                          releaseDate: this.exam.autoEvaluationConfig?.releaseDate
                              ? new Date(this.exam.autoEvaluationConfig.releaseDate).getTime()
                              : null,
                          amountDays: this.exam.autoEvaluationConfig?.amountDays,
                          gradeEvaluations: this.exam.autoEvaluationConfig?.gradeEvaluations,
                      }
                    : null,
            feedbackConfig:
                this.examFeedbackConfig.enabled && !this.collaborative
                    ? {
                          releaseType: this.exam.examFeedbackConfig?.releaseType,
                          releaseDate: this.exam.examFeedbackConfig?.releaseDate
                              ? new Date(this.exam.examFeedbackConfig.releaseDate).getTime()
                              : null,
                          amountDays: this.exam.examFeedbackConfig?.amountDays,
                      }
                    : null,
        };
        if (resetAutoEvaluationConfig) {
            this.exam = { ...this.exam, autoEvaluationConfig: undefined };
        }
        this.Exam.updateExam$(this.exam, config, this.collaborative).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_exam_saved'));
                const code = this.exam.course ? this.exam.course.code : null;
                this.Tabs.notifyExamUpdate({
                    name: this.exam.name,
                    code: code,
                    scaleChange: resetAutoEvaluationConfig,
                    initScale: false,
                });
                if (!this.autoEvaluation.enabled) {
                    delete this.exam.autoEvaluationConfig;
                }
                if (!this.examFeedbackConfig.enabled) {
                    delete this.exam.examFeedbackConfig;
                }
            },
            error: (err) => this.toast.error(err),
        });
    };

    checkScaleDisabled = (scale: GradeScale) => {
        if (!scale || !this.exam.course || !this.exam.course.gradeScale) {
            return false;
        }
        return !this.gradeScaleSetting.overridable && this.exam.course.gradeScale.id === scale.id;
    };

    setScale = (grading: GradeScale) => {
        this.exam.gradeScale = grading;
        this.updateExam(true);
    };

    getSelectableScales = () => {
        if (!this.gradeScales || !this.exam || !this.gradeScaleSetting) {
            return [];
        }

        return this.gradeScales.filter((scale: GradeScale) => {
            if (this.gradeScaleSetting.overridable) {
                return true;
            } else if (this.exam.course && this.exam.course.gradeScale) {
                return this.exam.course.gradeScale.id === scale.id;
            } else {
                return true;
            }
        });
    };

    checkScale = (scale: GradeScale) => {
        if (!this.exam.gradeScale) {
            return '';
        }
        return this.exam.gradeScale.id === scale.id ? 'btn-primary' : '';
    };

    canBeAutoEvaluated = () =>
        this.Exam.hasQuestions(this.exam) &&
        !this.Exam.hasEssayQuestions(this.exam) &&
        this.exam.gradeScale &&
        this.exam.executionType.type !== 'MATURITY';

    autoEvaluationConfigChanged = (event: { config: AutoEvaluationConfig }) =>
        (this.exam.autoEvaluationConfig = event.config);

    autoEvaluationDisabled = () => (this.autoEvaluation.enabled = false);
    autoEvaluationEnabled = () => (this.autoEvaluation.enabled = true);

    feedbackConfigChanged = (event: { config: ExamFeedbackConfig }) => (this.exam.examFeedbackConfig = event.config);

    feedbackConfigDisabled = () => (this.examFeedbackConfig.enabled = false);
    feedbackConfigEnabled = () => (this.examFeedbackConfig.enabled = true);

    nextTab = () => {
        this.Tabs.notifyTabChange(4);
        this.router.navigate(['..', '4'], { relativeTo: this.route });
    };

    previousTab = () => {
        this.Tabs.notifyTabChange(2);
        this.router.navigate(['..', '2'], { relativeTo: this.route });
    };

    private refreshExamTypes = () => {
        this.Exam.refreshExamTypes$().subscribe((types) => {
            // Maturity can only have a FINAL type
            if (this.exam.executionType.type === 'MATURITY') {
                types = types.filter((t) => t.type === 'FINAL');
            }
            this.examTypes = types;
        });
    };

    private refreshGradeScales = () => {
        this.Exam.refreshGradeScales$(this.collaborative).subscribe(
            (scales: GradeScale[]) => (this.gradeScales = scales),
        );
    };
}
