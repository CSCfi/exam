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
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { UIRouterModule } from '@uirouter/angular';
import { SharedModule } from '../shared/shared.module';
import { AssessmentComponent } from './assessment/assessment.component';
import { AssessmentService } from './assessment/assessment.service';
import { CollaborativeAssesmentService } from './assessment/collaborative-assessment.service';
import { FeedbackComponent } from './assessment/feedback/feedback.component';
import { StatementComponent } from './assessment/feedback/statement.component';
import { GeneralInfoComponent } from './assessment/general/general-info.component';
import { NoShowComponent } from './assessment/general/no-show.component';
import { ParticipationComponent } from './assessment/general/participation.component';
import { GradingComponent } from './assessment/grading/grading.component';
import { InspectionComponent } from './assessment/grading/inspection.component';
import { ToolbarComponent } from './assessment/grading/toolbar.component';
import { InspectionCommentDialogComponent } from './assessment/maturity/dialogs/inspection-comment-dialog.component';
import { MaturityGradingComponent } from './assessment/maturity/grading.component';
import { InspectionCommentsComponent } from './assessment/maturity/inspection-comments.component';
import { MaturityService } from './assessment/maturity/maturity.service';
import { MaturityToolbarComponent } from './assessment/maturity/toolbar.component';
import { PrintedAssessmentComponent } from './assessment/print/printed-assessment.component';
import { PrintedClozeTestComponent } from './assessment/print/printed-cloze-test.component';
import { PrintedEssayComponent } from './assessment/print/printed-essay.component';
import { PrintedMultiChoiceComponent } from './assessment/print/printed-multi-choice.component';
import { PrintedSectionComponent } from './assessment/print/printed-section.component';
import { ClaimChoiceAnswerComponent } from './assessment/questions/claim-choice-answer.component';
import { ClozeTestComponent } from './assessment/questions/cloze-test.component';
import { EssayQuestionComponent } from './assessment/questions/essay-question.component';
import { MultiChoiceAnswerComponent } from './assessment/questions/multi-choice-answer.component';
import { MultiChoiceQuestionComponent } from './assessment/questions/multi-choice-question.component';
import { WeightedMultiChoiceAnswerComponent } from './assessment/questions/weighted-multi-choice-answer.component';
import { ExamSectionComponent } from './assessment/sections/section.component';
import { ArchivedReviewsComponent } from './listing/categories/archived.component';
import { GradedLoggedReviewsComponent } from './listing/categories/graded-logged.component';
import { GradedReviewsComponent } from './listing/categories/graded.component';
import { InLanguageInspectionReviewsComponent } from './listing/categories/in-language-inspection.component';
import { InProgressReviewsComponent } from './listing/categories/in-progress.component';
import { RejectedReviewsComponent } from './listing/categories/rejected.component';
import { AbortedExamsComponent } from './listing/dialogs/aborted.component';
import { ArchiveDownloadComponent } from './listing/dialogs/archive-download.component';
import { SpeedReviewFeedbackComponent } from './listing/dialogs/feedback.component';
import { NoShowsComponent } from './listing/dialogs/no-shows.component';
import { ReviewListComponent } from './listing/review-list.component';
import { ReviewListService } from './listing/review-list.service';
import { SpeedReviewComponent } from './listing/speed-review.component';
import { ExamSummaryComponent } from './listing/summary/exam-summary.component';
import { ExamSummaryService } from './listing/summary/exam-summary.service';
import { EssayAnswerComponent } from './questions/assessment/essay-answer.component';
import { EssayAnswerListComponent } from './questions/assessment/essay-answers.component';
import { QuestionAssessmentComponent } from './questions/assessment/question-assessment.component';
import { QuestionFlowCategoryComponent } from './questions/flow/question-flow-category.component';
import { QuestionFlowComponent } from './questions/flow/question-flow.component';
import { QuestionReviewComponent } from './questions/listing/question-review.component';
import { QuestionReviewsComponent } from './questions/listing/question-reviews.component';
import { QuestionReviewService } from './questions/question-review.service';

@NgModule({
    imports: [NgbModule, UIRouterModule, SharedModule, DragDropModule],
    exports: [ReviewListComponent, QuestionReviewsComponent, ExamSummaryComponent],
    declarations: [
        AssessmentComponent,
        FeedbackComponent,
        StatementComponent,
        GradingComponent,
        InspectionComponent,
        ToolbarComponent,
        ReviewListComponent,
        ExamSummaryComponent,
        ClaimChoiceAnswerComponent,
        ClozeTestComponent,
        EssayQuestionComponent,
        MultiChoiceQuestionComponent,
        MultiChoiceAnswerComponent,
        WeightedMultiChoiceAnswerComponent,
        PrintedAssessmentComponent,
        PrintedClozeTestComponent,
        PrintedEssayComponent,
        PrintedMultiChoiceComponent,
        PrintedSectionComponent,
        ExamSectionComponent,
        GeneralInfoComponent,
        ParticipationComponent,
        NoShowComponent,
        InspectionCommentDialogComponent,
        InspectionCommentsComponent,
        MaturityGradingComponent,
        MaturityToolbarComponent,
        SpeedReviewFeedbackComponent,
        SpeedReviewComponent,
        NoShowsComponent,
        AbortedExamsComponent,
        ArchiveDownloadComponent,
        InProgressReviewsComponent,
        GradedReviewsComponent,
        GradedLoggedReviewsComponent,
        InLanguageInspectionReviewsComponent,
        RejectedReviewsComponent,
        ArchivedReviewsComponent,
        EssayAnswerComponent,
        EssayAnswerListComponent,
        QuestionAssessmentComponent,
        QuestionFlowComponent,
        QuestionFlowCategoryComponent,
        QuestionReviewComponent,
        QuestionReviewsComponent,
    ],
    bootstrap: [
        InspectionCommentDialogComponent,
        ArchiveDownloadComponent,
        SpeedReviewFeedbackComponent,
        AbortedExamsComponent,
        NoShowsComponent,
    ],
    providers: [
        AssessmentService,
        CollaborativeAssesmentService,
        ReviewListService,
        MaturityService,
        QuestionReviewService,
        ExamSummaryService,
    ],
})
export class ReviewModule {}
