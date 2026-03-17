// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, DecimalPipe, KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Chart } from 'chart.js';
import { DateTime } from 'luxon';
import type { ExamEnrolment, ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Exam } from 'src/app/exam/exam.model';
import { AbortedExamsComponent } from 'src/app/review/listing/dialogs/aborted.component';
import { NoShowsComponent } from 'src/app/review/listing/dialogs/no-shows.component';
import { ReviewListService } from 'src/app/review/listing/review-list.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FileService } from 'src/app/shared/file/file.service';
import { ChartService } from './chart.service';
import { ExamSummaryService } from './exam-summary.service';

@Component({
    selector: 'xm-exam-summary',
    templateUrl: './exam-summary.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgbPopover, DecimalPipe, DatePipe, KeyValuePipe, TranslateModule],
})
export class ExamSummaryComponent {
    readonly exam = signal<Exam | undefined>(undefined);
    readonly reviews = signal<ExamParticipation[]>([]);
    readonly noShows = signal<ExamEnrolment[]>([]);
    readonly gradedCount = computed(() => this.reviews().filter((r) => r.exam.gradedTime).length);
    readonly abortedExams = computed(() =>
        this.ReviewList.filterByStateAndEnhance(['ABORTED'], this.reviews(), this.collaborative),
    );
    readonly sectionScores = computed(() => {
        const examVal = this.exam();
        return examVal ? this.ExamSummary.calcSectionMaxAndAverages(this.reviews(), examVal) : {};
    });

    readonly collaborative: boolean;

    private gradeTimeChart!: Chart<'scatter'>;
    private examinationDateDistribution!: Chart<'line'>;

    private readonly route = inject(ActivatedRoute);
    private readonly translate = inject(TranslateService);
    private readonly modal = inject(ModalService);
    private readonly ChartService = inject(ChartService);
    private readonly ExamSummary = inject(ExamSummaryService);
    private readonly ReviewList = inject(ReviewListService);
    private readonly Files = inject(FileService);
    private readonly Tabs = inject(ExamTabService);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        this.collaborative = this.Tabs.isCollaborative();

        this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
            this.reviews.set(data.reviews);
            this.exam.set(this.Tabs.getExam());
            this.refresh();
            this.Tabs.notifyTabChange(7);
        });

        // Had to manually update chart locales
        this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateChartLocale());
    }

    getRegisteredCount = () => this.reviews().length;

    getReadFeedback = () =>
        this.reviews().filter((r) => r.exam.examFeedback && r.exam.examFeedback.feedbackStatus === true).length;

    getTotalFeedback = () =>
        this.reviews().filter(
            (r) =>
                r.exam.examFeedback &&
                (r.exam.state === 'GRADED_LOGGED' || r.exam.state === 'ARCHIVED' || r.exam.state === 'REJECTED'),
        ).length;

    getFeedbackPercentage = () => (this.getReadFeedback() / this.getTotalFeedback()) * 100;

    getQuestionCounts = () => {
        const exam = this.exam();
        if (!exam) return '';
        const effectiveCount = exam.examSections.reduce(
            (sum, es) => sum + (es.lotteryOn ? es.lotteryItemCount : es.sectionQuestions.length),
            0,
        );
        const totalCount = exam.examSections.reduce((sum, es) => sum + es.sectionQuestions.length, 0);
        return `${effectiveCount} (${totalCount})`;
    };

    calculateAverage = (ns?: number[]) => (ns || []).reduce((a, b) => a + b, 0) / (ns?.length || 1);

    getAverageTime = () => {
        const durations = this.reviews().map((r) => this.ReviewList.diffInMinutes(r.started, r.ended));
        return (durations.reduce((a, b) => a + b, 0) / durations.length || 1).toFixed(2);
    };

    printQuestionScoresReport = () => {
        const ids = this.reviews().map((r) => r.exam.id);
        if (ids.length > 0) {
            const url = '/app/statistics/questionreport/' + this.exam()!.id;
            this.Files.download(
                url,
                this.translate.instant('i18n_grading_info') + '_' + DateTime.now().toFormat('dd-MM-yyyy') + '.xlsx',
                { params: { ids: ids }, method: 'POST' },
            );
        }
    };

    openAborted = () => {
        const modalRef = this.modal.openRef(AbortedExamsComponent, { size: 'xl' });
        modalRef.componentInstance.exam.set(this.exam());
        modalRef.componentInstance.abortedExams.set(this.abortedExams());
    };

    openNoShows = () => {
        const modalRef = this.modal.openRef(NoShowsComponent, { size: 'xl' });
        modalRef.componentInstance.noShows.set(this.noShows());
    };

    private refresh = () => {
        const reviews = this.reviews();
        const exam = this.exam();
        if (!exam) return;
        this.ExamSummary.getNoShows$(this.collaborative, exam).subscribe((ns) => this.noShows.set(ns));
        this.ChartService.getGradeDistributionChart('gradeDistributionChart', reviews);
        this.examinationDateDistribution = this.ChartService.getExaminationTimeDistributionChart(
            'examinationDateDistributionChart',
            reviews,
            exam,
        );
        this.gradeTimeChart = this.ChartService.getGradeTimeChart('gradeTimeChart', reviews, exam);
        this.ChartService.getQuestionScoreChart('questionScoreChart', reviews);
        this.ChartService.getApprovalRateChart('approvalRatingChart', reviews);
    };

    private updateChartLocale() {
        if (this.gradeTimeChart.options?.scales) {
            const scales = this.gradeTimeChart.options.scales;
            if (scales.x?.title) {
                scales.x.title.text = this.translate.instant('i18n_word_points').toLowerCase();
            }
            if (scales.y?.title) {
                scales.y.title.text = this.translate.instant('i18n_word_minutes').toLowerCase();
            }
        }
        this.gradeTimeChart.update();
        if (this.examinationDateDistribution.options?.scales) {
            const scales = this.examinationDateDistribution.options.scales;
            if (scales.x?.title) {
                scales.x.title.text = this.translate.instant('i18n_days_since_period_beginning').toLowerCase();
            }
        }
        if (this.examinationDateDistribution.data?.datasets) {
            this.examinationDateDistribution.data.datasets[0].label = this.translate.instant('i18n_amount_exams');
        }
        this.examinationDateDistribution.update();
    }
}
