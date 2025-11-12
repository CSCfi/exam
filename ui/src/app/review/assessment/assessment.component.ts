// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { ExamService } from 'src/app/exam/exam.service';
import type { Examination } from 'src/app/examination/examination.model';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import type { QuestionAmounts } from 'src/app/question/question.model';
import { ClozeTestAnswer } from 'src/app/question/question.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './assessment.component.html',
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
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class AssessmentComponent implements OnInit {
    collaborative = signal(false);
    questionSummary = signal<QuestionAmounts>({ accepted: 0, rejected: 0, hasEssays: false });
    exam = signal<Examination | undefined>(undefined);
    participation = signal<ExamParticipation | undefined>(undefined);
    hideGeneralInfo = signal(false);
    hideGradeInfo = signal(false);
    user: User;

    private ref = '';
    private examId = 0;

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private http = inject(HttpClient);
    private toast = inject(ToastrService);
    private Assessment = inject(AssessmentService);
    private CollaborativeAssessment = inject(CollaborativeAssesmentService);
    private QuestionScore = inject(QuestionScoringService);
    private Exam = inject(ExamService);
    private Session = inject(SessionService);

    constructor() {
        this.user = this.Session.getUser();
    }

    ngOnInit() {
        this.collaborative.set(this.route.snapshot.data.collaborative);
        this.examId = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
        const path = this.collaborative() ? `${this.examId}/${this.ref}` : this.examId.toString();
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
                this.questionSummary.set(this.QuestionScore.getQuestionAmounts(exam));
                this.exam.set(exam);
                this.participation.set(participation);
            },
            error: (err) => this.toast.error(err),
        });
    }

    isUnderLanguageInspection = () => {
        if (!this.user) return false;
        const examValue = this.exam();
        return (
            examValue &&
            this.user.isLanguageInspector &&
            examValue.languageInspection &&
            !examValue.languageInspection.finishedAt
        );
    };

    print = () => {
        const examValue = this.exam();
        if (!examValue) return;
        const url = this.collaborative()
            ? `/staff/assessments/${this.examId}/print/${this.ref}`
            : `/staff/assessments/${examValue.id}/print`;
        window.open(url, '_blank');
    };

    scoreSet = (revision: string) => {
        const participationValue = this.participation();
        const examValue = this.exam();
        if (!participationValue || !examValue) return;
        participationValue._rev = revision;
        this.questionSummary.set(this.QuestionScore.getQuestionAmounts(examValue));
        this.startReview();
    };

    gradingUpdated = () => this.startReview();

    isOwnerOrAdmin = () => {
        const examValue = this.exam();
        return examValue ? this.Exam.isOwnerOrAdmin(examValue, this.collaborative()) : false;
    };
    isReadOnly = () => {
        const examValue = this.exam();
        return examValue ? this.Assessment.isReadOnly(examValue) : false;
    };
    isGraded = () => {
        const examValue = this.exam();
        return examValue ? this.Assessment.isGraded(examValue) : false;
    };

    goToAssessment = () => {
        const examValue = this.exam();
        if (!examValue) return;
        this.router.navigate(['/staff/exams/', this.collaborative() ? this.examId : examValue.parent?.id, '5'], {
            queryParams: this.collaborative() ? { collaborative: true } : {},
        });
    };

    // Set review status as started if not already done so
    private startReview = () => {
        const examValue = this.exam();
        const participationValue = this.participation();
        if (!examValue || examValue.state !== 'REVIEW') return;

        const state = 'REVIEW_STARTED';
        if (!this.collaborative()) {
            const review = this.Assessment.getPayload(examValue, state);
            this.http.put(`/app/review/${review.id}`, review).subscribe(() => {
                examValue.state = state;
                this.exam.set(examValue); // Update signal to trigger change detection
            });
        } else {
            if (!participationValue) return;
            const review = this.CollaborativeAssessment.getPayload(examValue, state, participationValue._rev as string);
            const url = `/app/iop/reviews/${this.examId}/${this.ref}`;
            this.http.put<{ rev: string }>(url, review).subscribe((resp) => {
                participationValue._rev = resp.rev;
                examValue.state = state;
                this.participation.set(participationValue); // Update signal
                this.exam.set(examValue); // Update signal to trigger change detection
            });
        }
    };

    private getResource = (path: string) => (this.collaborative() ? `/app/iop/reviews/${path}` : `/app/review/${path}`);
}
