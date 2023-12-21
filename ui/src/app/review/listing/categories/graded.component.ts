/*
 * Copyright (c) 2018 Exam Consortium
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
import { HttpClient } from '@angular/common/http';
import type { SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import type { Exam } from '../../../exam/exam.model';
import { SessionService } from '../../../session/session.service';
import { ConfirmationDialogService } from '../../../shared/dialogs/confirmation-dialog.service';
import { CommonExamService } from '../../../shared/miscellaneous/common-exam.service';
import { AssessmentService } from '../../assessment/assessment.service';
import type { Review } from '../../review.model';
import type { ReviewListView } from '../review-list.service';
import { ReviewListService } from '../review-list.service';

@Component({
    selector: 'xm-rl-graded',
    templateUrl: './graded.component.html',
})
export class GradedReviewsComponent implements OnInit, OnChanges {
    @Input() exam!: Exam;
    @Input() reviews: Review[] = [];
    @Input() collaborative = false;
    @Output() registered = new EventEmitter<Review[]>();
    view!: ReviewListView;
    needsFeedbackWarning = false;
    selections: { all: boolean; page: boolean } = { all: false, page: false };

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
        private Confirmation: ConfirmationDialogService,
        private ReviewList: ReviewListService,
        private Assessment: AssessmentService,
        private CommonExam: CommonExamService,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        this.init();
        if (!this.exam.examFeedbackConfig) {
            this.needsFeedbackWarning = false;
        } else {
            this.http
                .get<{ status: 'nothing' | 'everything' }>(`/app/review/${this.exam.id}/locked`)
                .subscribe((setting) => (this.needsFeedbackWarning = setting.status === 'everything'));
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.reviews) {
            this.init();
            this.applyFreeSearchFilter();
        }
    }

    showId = () => this.Session.getUser().isAdmin && this.exam?.anonymous;

    applyFreeSearchFilter = () => (this.view.filtered = this.ReviewList.applyFilter(this.view.filter, this.view.items));

    sendSelectedToRegistry = () => {
        const selection = this.ReviewList.getSelectedReviews(this.view.filtered);
        if (selection.length == 0) {
            return;
        }
        const content = this.Assessment.getRecordReviewConfirmationDialogContent('', this.needsFeedbackWarning);
        const examId = this.collaborative ? this.exam.id : undefined;
        this.Confirmation.open$(this.translate.instant('i18n_confirm'), content).subscribe({
            next: () =>
                forkJoin(selection.map((s) => this.ReviewList.sendToRegistry$(s.examParticipation, examId))).subscribe(
                    () => {
                        this.registered.emit(selection);
                        this.toast.info(this.translate.instant('i18n_results_send_ok'));
                    },
                ),
        });
    };

    getLinkToAssessment = (review: Review) =>
        this.collaborative
            ? `/assessments/collaborative/${this.exam.id}/${review.examParticipation._id}`
            : `/assessments/${review.examParticipation.exam.id}`;

    pageSelected = (event: { page: number }) => (this.view.page = event.page);

    selectAll = () => this.ReviewList.selectAll(this.selections, this.view.filtered);

    selectPage = (selector: string) => this.ReviewList.selectPage(this.selections, this.view.filtered, selector);

    setPredicate = (predicate: string) => {
        if (this.view.predicate === predicate) {
            this.view.reverse = !this.view.reverse;
        }
        this.view.predicate = predicate;
    };

    private init() {
        this.view = this.ReviewList.prepareView(this.reviews, this.handleGradedReviews, 'examParticipation.deadline');
        this.selections = { all: false, page: false };
    }

    private translateGrade = (exam: Exam) => {
        const grade = exam.grade ? exam.grade.name : 'NONE';
        return this.CommonExam.getExamGradeDisplayName(grade);
    };

    private handleGradedReviews = (r: Review) => {
        r.displayedGradingTime = r.examParticipation.exam.languageInspection
            ? r.examParticipation.exam.languageInspection.finishedAt
            : r.examParticipation.exam.gradedTime;
        r.displayedGrade = this.translateGrade(r.examParticipation.exam);
        r.displayedCredit = this.CommonExam.getExamDisplayCredit(r.examParticipation.exam);
    };
}
