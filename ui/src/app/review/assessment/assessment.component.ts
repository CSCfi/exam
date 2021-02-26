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
import { Component, Input } from '@angular/core';
import { StateService } from '@uirouter/core';
import * as toast from 'toastr';

import type { ClozeTestAnswer, Exam, ExamParticipation } from '../../exam/exam.model';
import { ExamService } from '../../exam/exam.service';
import type { QuestionAmounts } from '../../question/question.service';
import { QuestionService } from '../../question/question.service';
import type { User } from '../../session/session.service';
import { SessionService } from '../../session/session.service';
import { WindowRef } from '../../utility/window/window.service';
import { AssessmentService } from './assessment.service';
import { CollaborativeAssesmentService } from './collaborativeAssessment.service';

@Component({
    selector: 'assessment',
    templateUrl: './assessment.component.html',
})
export class AssessmentComponent {
    @Input() collaborative: boolean;

    questionSummary: QuestionAmounts;
    exam: Exam;
    participation: ExamParticipation;
    user: User;
    backUrl: string;
    hideGeneralInfo = false;
    hideGradeInfo = false;

    constructor(
        private state: StateService,
        private http: HttpClient,
        private Assessment: AssessmentService,
        private CollaborativeAssessment: CollaborativeAssesmentService,
        private Question: QuestionService,
        private Exam: ExamService,
        private Session: SessionService,
        private Window: WindowRef,
    ) {}

    ngOnInit() {
        const path = this.collaborative ? `${this.state.params.id}/${this.state.params.ref}` : this.state.params.id;
        const url = this.getResource(path);
        this.http.get<ExamParticipation>(url).subscribe(
            (participation) => {
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

                this.questionSummary = this.Question.getQuestionAmounts(exam);
                this.exam = exam;
                this.participation = participation;
                this.user = this.Session.getUser();
                this.backUrl = this.Assessment.getExitUrl(this.exam, this.collaborative);
            },
            (err) => toast.error(err.data),
        );
    }

    isUnderLanguageInspection = () => {
        if (!this.user) return false;
        return (
            this.user.isLanguageInspector && this.exam.languageInspection && !this.exam.languageInspection.finishedAt
        );
    };

    print = () => {
        const url = this.collaborative
            ? `/print/exam/${this.state.params.id}/${this.state.params.ref}`
            : `/print/exam/${this.exam.id}`;
        this.Window.nativeWindow.open(url, '_blank');
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

    setCommentRead = () => this.Assessment.setCommentRead(this.exam);

    goToAssessment = () =>
        this.state.go('examEditor.assessments', {
            id: this.exam.parent?.id,
            collaborative: this.collaborative ? 'collaborative' : 'false',
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
                const url = `/integration/iop/reviews/${this.state.params.id}/${this.state.params.ref}`;
                this.http.put<{ rev: string }>(url, review).subscribe((resp) => {
                    this.participation._rev = resp.rev;
                    this.exam.state = state;
                });
            }
        }
    };

    private getResource = (path: string) =>
        this.collaborative ? `/integration/iop/reviews/${path}` : `/app/review/${path}`;
}
