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
import { DatePipe, DecimalPipe, KeyValuePipe } from '@angular/common';
import { Component, OnChanges, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbModal, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Chart } from 'chart.js';
import { format } from 'date-fns';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Exam, ExamParticipation } from 'src/app/exam/exam.model';
import { AbortedExamsComponent } from 'src/app/review/listing/dialogs/aborted.component';
import { NoShowsComponent } from 'src/app/review/listing/dialogs/no-shows.component';
import { ReviewListService } from 'src/app/review/listing/review-list.service';
import type { Review } from 'src/app/review/review.model';
import { FileService } from 'src/app/shared/file/file.service';
import { ExamSummaryService } from './exam-summary.service';

@Component({
    selector: 'xm-exam-summary',
    templateUrl: './exam-summary.component.html',
    standalone: true,
    imports: [NgbPopover, DecimalPipe, DatePipe, KeyValuePipe, TranslateModule],
})
export class ExamSummaryComponent implements OnInit, OnChanges {
    exam!: Exam;
    reviews: ExamParticipation[] = [];
    collaborative = false;

    gradedCount = 0;
    abortedExams: Review[] = [];
    noShows: ExamEnrolment[] = [];
    gradeDistributionChart!: Chart;
    gradeTimeChart!: Chart<'scatter'>;
    examinationDateDistribution!: Chart<'line'>;
    questionScoreChart!: Chart<'line'>;
    approvalRatingChart!: Chart<'line'>;
    sectionScores: Record<string, { max: number; totals: number[] }> = {};

    constructor(
        private route: ActivatedRoute,
        private translate: TranslateService,
        private modal: NgbModal,
        private ExamSummary: ExamSummaryService,
        private ReviewList: ReviewListService,
        private Files: FileService,
        private Tabs: ExamTabService,
    ) {}

    ngOnInit() {
        this.route.data.subscribe((data) => {
            this.reviews = data.reviews;
            this.exam = this.Tabs.getExam();
            this.collaborative = this.Tabs.isCollaborative();
            this.refresh();
            // Had to manually update chart locales
            this.translate.onLangChange.subscribe(this.updateChartLocale);
            this.sectionScores = this.ExamSummary.calcSectionMaxAndAverages(this.reviews, this.exam);
            this.Tabs.notifyTabChange(7);
        });
    }

    ngOnChanges() {
        this.refresh();
    }

    getRegisteredCount = () => this.reviews.length;

    getReadFeedback = () =>
        this.reviews.filter((r) => r.exam.examFeedback && r.exam.examFeedback.feedbackStatus === true).length;

    getTotalFeedback = () =>
        this.reviews.filter(
            (r) =>
                r.exam.examFeedback &&
                (r.exam.state === 'GRADED_LOGGED' || r.exam.state === 'ARCHIVED' || r.exam.state === 'REJECTED'),
        ).length;

    getFeedbackPercentage = () => (this.getReadFeedback() / this.getTotalFeedback()) * 100;

    getQuestionCounts = () => {
        const effectiveCount = this.exam.examSections.reduce(
            (sum, es) => sum + (es.lotteryOn ? es.lotteryItemCount : es.sectionQuestions.length),
            0,
        );
        const totalCount = this.exam.examSections.reduce((sum, es) => sum + es.sectionQuestions.length, 0);
        return `${effectiveCount} (${totalCount})`;
    };

    calcAverage = (ns?: number[]) => (ns || []).reduce((a, b) => a + b, 0) / (ns?.length || 1);

    getAverageTime = () => {
        const durations = this.reviews.map((r) => this.ReviewList.diffInMinutes(r.started, r.ended));
        return (durations.reduce((a, b) => a + b, 0) / durations.length || 1).toFixed(2);
    };

    printQuestionScoresReport = () => {
        const ids = this.reviews.map((r) => r.exam.id);
        if (ids.length > 0) {
            const url = '/app/reports/questionreport/' + this.exam.id;
            this.Files.download(
                url,
                this.translate.instant('i18n_grading_info') + '_' + format(new Date(), 'dd-MM-yyyy') + '.xlsx',
                { childIds: ids.map((i) => i.toString()) },
                true,
            );
        }
    };

    openAborted = () => {
        const modalRef = this.modal.open(AbortedExamsComponent, {
            backdrop: 'static',
            keyboard: true,
            windowClass: 'question-editor-modal',
            size: 'xl',
        });
        modalRef.componentInstance.exam = this.exam;
        modalRef.componentInstance.abortedExams = this.abortedExams;
    };

    openNoShows = () => {
        const modalRef = this.modal.open(NoShowsComponent, {
            backdrop: 'static',
            keyboard: true,
            windowClass: 'question-editor-modal',
            size: 'xl',
        });
        modalRef.componentInstance.noShows = this.noShows;
    };

    private refresh = () => {
        this.ExamSummary.getNoShows$(this.collaborative, this.exam).subscribe((ns) => (this.noShows = ns));
        this.gradeDistributionChart = this.ExamSummary.getGradeDistributionChart(
            'gradeDistributionChart',
            this.reviews,
        );
        this.examinationDateDistribution = this.ExamSummary.getExaminationTimeDistributionChart(
            'examinationDateDistributionChart',
            this.reviews,
            this.exam,
        );
        this.gradeTimeChart = this.ExamSummary.getGradeTimeChart('gradeTimeChart', this.reviews, this.exam);
        this.questionScoreChart = this.ExamSummary.getQuestionScoreChart('questionScoreChart', this.reviews);
        this.approvalRatingChart = this.ExamSummary.getApprovalRateChart('approvalRatingChart', this.reviews);
        this.gradedCount = this.reviews.filter((r) => r.exam.gradedTime).length;
        this.abortedExams = this.ReviewList.filterByStateAndEnhance(['ABORTED'], this.reviews, this.collaborative);
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
