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
import type { OnChanges, SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import type { Exam } from '../../../exam/exam.model';
import { SessionService } from '../../../session/session.service';
import { FileService } from '../../../shared/file/file.service';
import { CommonExamService } from '../../../shared/miscellaneous/common-exam.service';
import type { Review } from '../../review.model';
import type { ReviewListView } from '../review-list.service';
import { ReviewListService } from '../review-list.service';

@Component({
    selector: 'xm-rl-graded-logged',
    templateUrl: './graded-logged.component.html',
})
export class GradedLoggedReviewsComponent implements OnInit, OnChanges {
    @Input() reviews: Review[] = [];
    @Input() exam!: Exam;
    @Input() collaborative = false;
    @Output() archived = new EventEmitter<Review[]>();
    view!: ReviewListView;
    selections: { all: boolean; page: boolean } = { all: false, page: false };

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
        private ReviewList: ReviewListService,
        private Files: FileService,
        private CommonExam: CommonExamService,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        this.init();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.reviews) {
            this.init();
            this.applyFreeSearchFilter();
        }
    }

    applyFreeSearchFilter = () => (this.view.filtered = this.ReviewList.applyFilter(this.view.filter, this.view.items));

    showId = () => this.Session.getUser().isAdmin && this.exam?.anonymous;

    pageSelected = (event: { page: number }) => (this.view.page = event.page);

    setPredicate = (predicate: string) => {
        if (this.view.predicate === predicate) {
            this.view.reverse = !this.view.reverse;
        }
        this.view.predicate = predicate;
    };

    getLinkToAssessment = (review: Review) =>
        this.collaborative
            ? `/assessments/collaborative/${this.exam.id}/${review.examParticipation._id}`
            : `/assessments/${review.examParticipation.exam.id}`;

    archiveSelected = () => {
        const selection = this.ReviewList.getSelectedReviews(this.view.filtered);
        if (selection.length == 0) {
            return;
        }
        const ok = () => {
            this.archived.emit(selection);
            this.toast.info(this.translate.instant('i18n_exams_archived'));
        };
        const ids = selection.map((r) => r.examParticipation.exam.id);
        this.http.put('/app/reviews/archive', { ids: ids.join() }).subscribe(ok);
    };

    printSelected = (asReport: boolean) => {
        const selection = this.ReviewList.getSelectedReviews(this.view.filtered);
        if (selection.length == 0) {
            return;
        }
        let url = this.collaborative ? '/app/iop/reviews/' : '/app/exam/record/export/';
        if (asReport) {
            url += 'report/';
        }
        const fileType = asReport ? 'xlsx' : 'csv';
        const ids = selection.map((r) =>
            this.collaborative ? (r.examParticipation._id as string) : r.examParticipation.exam.id,
        );

        this.Files.download(
            url + this.exam.id,
            `${this.translate.instant('i18n_grading_info')}_${format(new Date(), 'dd-MM-yyyy')}.${fileType}`,
            { childIds: ids.map((i) => i.toString()) },
            true,
        );
    };

    selectAll = () => this.ReviewList.selectAll(this.selections, this.view.filtered);

    selectPage = (selector: string) => this.ReviewList.selectPage(this.selections, this.view.filtered, selector);

    private init = () => {
        this.view = {
            ...this.ReviewList.prepareView(this.reviews, this.handleGradedReviews, 'examParticipation.started'),
            reverse: true,
        };
        this.selections = { all: false, page: false };
    };

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
