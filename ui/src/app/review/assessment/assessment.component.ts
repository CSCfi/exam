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

import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ClozeTestAnswer, ExamParticipation } from '../../exam/exam.model';
import { ExamService } from '../../exam/exam.service';
import type { Examination } from '../../examination/examination.model';
import type { QuestionAmounts } from '../../question/question.service';
import { QuestionService } from '../../question/question.service';
import type { User } from '../../session/session.service';
import { SessionService } from '../../session/session.service';
import { CourseCodeComponent } from '../../shared/miscellaneous/course-code.component';
import { OrderByPipe } from '../../shared/sorting/order-by.pipe';
import { AssessmentService } from './assessment.service';
import { CollaborativeAssesmentService } from './collaborative-assessment.service';
import { FeedbackComponent } from './feedback/feedback.component';
import { StatementComponent } from './feedback/statement.component';
import { GeneralInfoComponent } from './general/general-info.component';
import { GradingComponent } from './grading/grading.component';
import { MaturityGradingComponent } from './maturity/grading.component';
import { ExamSectionComponent } from './sections/section.component';

@Component({
    selector: 'xm-assessment',
    templateUrl: './assessment.component.html',
    standalone: true,
    imports: [
        CourseCodeComponent,
        NgbCollapse,
        GeneralInfoComponent,
        ExamSectionComponent,
        GradingComponent,
        MaturityGradingComponent,
        FeedbackComponent,
        StatementComponent,
        TranslateModule,
        OrderByPipe,
    ],
})
export class AssessmentComponent implements OnInit {
    collaborative = false;
    questionSummary: QuestionAmounts = { accepted: 0, rejected: 0, hasEssays: false, totalSelectionEssays: 0 };
    exam!: Examination;
    participation!: ExamParticipation;
    user: User;
    hideGeneralInfo = false;
    hideGradeInfo = false;
    private ref = '';
    private examId = 0;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private http: HttpClient,
        private toast: ToastrService,
        private Assessment: AssessmentService,
        private CollaborativeAssessment: CollaborativeAssesmentService,
        private Question: QuestionService,
        private Exam: ExamService,
        private Session: SessionService,
    ) {
        this.user = this.Session.getUser();
    }

    ngOnInit() {
        this.collaborative = this.route.snapshot.data.collaborative;
        this.examId = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
        const path = this.collaborative ? `${this.examId}/${this.ref}` : this.examId.toString();
        const url = this.getResource(path);
        this.http.get<Omit<ExamParticipation, 'exam'> & { exam: Examination }>(url).subscribe({
            next: (participation) => {
                const exam = participation.exam;
                exam.examSections.forEach((es) =>
                    es.sectionQuestions
                        .filter((esq) => esq.question.type === 'ClozeTestQuestion' && esq.clozeTestAnswer?.answer)
                        .forEach(
                            (esq) =>
                                ((esq.clozeTestAnswer as ClozeTestAnswer).answer = JSON.parse(
                                    esq.clozeTestAnswer?.answer as string,
                                )),
                        ),
                );
                if (!exam.examFeedback) {
                    exam.examFeedback = { id: undefined, comment: '' };
                }
                if (exam.languageInspection && !exam.languageInspection.statement) {
                    exam.languageInspection.statement = { comment: '' };
                }
                this.questionSummary = this.Question.getQuestionAmounts(exam);
                this.exam = exam;
                this.participation = participation;
            },
            error: (err) => this.toast.error(err),
        });
    }

    isUnderLanguageInspection = () => {
        if (!this.user) return false;
        return (
            this.user.isLanguageInspector && this.exam.languageInspection && !this.exam.languageInspection.finishedAt
        );
    };

    print = () => {
        const url = this.collaborative
            ? `/staff/assessments/${this.examId}/print/${this.ref}`
            : `/staff/assessments/${this.exam.id}/print`;
        window.open(url, '_blank');
    };

    scoreSet = (revision: string) => {
        this.participation._rev = revision;
        this.questionSummary = this.Question.getQuestionAmounts(this.exam);
        this.startReview();
    };

    gradingUpdated = () => this.startReview();

    isOwnerOrAdmin = () => this.Exam.isOwnerOrAdmin(this.exam, this.collaborative);
    isReadOnly = () => this.Assessment.isReadOnly(this.exam);
    isGraded = () => this.Assessment.isGraded(this.exam);

    goToAssessment = () =>
        this.router.navigate(['/staff/exams/', this.collaborative ? this.examId : this.exam.parent?.id, '5'], {
            queryParams: this.collaborative ? { collaborative: true } : {},
        });

    // Set review status as started if not already done so
    private startReview = () => {
        if (this.exam.state === 'REVIEW') {
            const state = 'REVIEW_STARTED';
            if (!this.collaborative) {
                const review = this.Assessment.getPayload(this.exam, state);
                this.http.put(`/app/review/${review.id}`, review).subscribe(() => (this.exam.state = state));
            } else {
                const review = this.CollaborativeAssessment.getPayload(
                    this.exam,
                    state,
                    this.participation._rev as string,
                );
                const url = `/app/iop/reviews/${this.examId}/${this.ref}`;
                this.http.put<{ rev: string }>(url, review).subscribe((resp) => {
                    this.participation._rev = resp.rev;
                    this.exam.state = state;
                });
            }
        }
    };

    private getResource = (path: string) => (this.collaborative ? `/app/iop/reviews/${path}` : `/app/review/${path}`);
}
