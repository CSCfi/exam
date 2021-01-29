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
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import * as toast from 'toastr';

import { Exam } from '../../../exam/exam.model';
import { ExamService } from '../../../exam/exam.service';
import { SessionService } from '../../../session/session.service';
import { ConfirmationDialogService } from '../../../utility/dialogs/confirmationDialog.service';
import { Review } from '../../review.model';
import { ReviewListService, ReviewListView } from '../reviewList.service';

@Component({
    selector: 'rl-graded',
    templateUrl: './graded.component.html',
})
export class GradedReviewsComponent {
    @Input() exam: Exam;
    @Input() reviews: Review[];
    @Input() collaborative: boolean;
    @Output() onRegistered = new EventEmitter<Review[]>();
    view: ReviewListView;
    selections: { all: boolean; page: boolean };

    constructor(
        private translate: TranslateService,
        private Confirmation: ConfirmationDialogService,
        private ReviewList: ReviewListService,
        private Exam: ExamService,
        private Session: SessionService,
    ) {}

    private init() {
        this.view = this.ReviewList.prepareView(this.reviews, this.handleGradedReviews, 'deadline');
        this.selections = { all: false, page: false };
    }

    ngOnInit() {
        this.init();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.reviews) {
            this.init();
            this.applyFreeSearchFilter();
        }
    }

    showId = () => this.Session.getUser().isAdmin && this.exam.anonymous;

    applyFreeSearchFilter = () => (this.view.filtered = this.ReviewList.applyFilter(this.view.filter, this.view.items));

    sendSelectedToRegistry = () => {
        const selection = this.ReviewList.getSelectedReviews(this.view.filtered);
        if (selection.length == 0) {
            return;
        }
        const examId = this.collaborative ? this.exam.id : undefined;
        this.Confirmation.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_confirm_record_review'),
        ).result.then(() =>
            forkJoin(selection.map(s => this.ReviewList.sendToRegistry$(s.examParticipation, examId))).subscribe(() => {
                this.onRegistered.emit(selection);
                toast.info(this.translate.instant('sitnet_results_send_ok'));
            }),
        );
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

    private translateGrade = (exam: Exam) => {
        const grade = exam.grade ? exam.grade.name : 'NONE';
        return this.Exam.getExamGradeDisplayName(grade);
    };

    private handleGradedReviews = (r: Review) => {
        r.displayedGradingTime = r.examParticipation.exam.languageInspection
            ? r.examParticipation.exam.languageInspection.finishedAt
            : r.examParticipation.exam.gradedTime;
        r.displayedGrade = this.translateGrade(r.examParticipation.exam);
        r.displayedCredit = this.Exam.getExamDisplayCredit(r.examParticipation.exam);
    };
}
