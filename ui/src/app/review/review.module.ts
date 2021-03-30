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

import { UtilityModule } from '../utility/utility.module';
import { AssessmentComponent } from './assessment/assessment.component';
import { AssessmentService } from './assessment/assessment.service';
import { CollaborativeAssesmentService } from './assessment/collaborativeAssessment.service';
import { FeedbackComponent } from './assessment/feedback/feedback.component';
import { StatementComponent } from './assessment/feedback/statement.component';
import { GeneralInfoComponent } from './assessment/general/generalInfo.component';
import { ParticipationComponent } from './assessment/general/participation.component';
import { GradingComponent } from './assessment/grading/grading.component';
import { InspectionComponent } from './assessment/grading/inspection.component';
import { ToolbarComponent } from './assessment/grading/toolbar.component';
import { InspectionCommentDialogComponent } from './assessment/maturity/dialogs/inspectionCommentDialog.component';
import { MaturityGradingComponent } from './assessment/maturity/grading.component';
import { InspectionCommentsComponent } from './assessment/maturity/inspectionComments.component';
import { MaturityService } from './assessment/maturity/maturity.service';
import { MaturityToolbarComponent } from './assessment/maturity/toolbar.component';
import { PrintedAssessmentComponent } from './assessment/print/printedAssessment.component';
import { PrintedClozeTestComponent } from './assessment/print/printedClozeTest.component';
import { PrintedEssayComponent } from './assessment/print/printedEssay.component';
import { PrintedMultiChoiceComponent } from './assessment/print/printedMultiChoice.component';
import { PrintedSectionComponent } from './assessment/print/printedSection.component';
import { ClaimChoiceAnswerComponent } from './assessment/questions/claimChoiceAnswer.component';
import { ClozeTestComponent } from './assessment/questions/clozeTest.component';
import { EssayQuestionComponent } from './assessment/questions/essayQuestion.component';
import { MultiChoiceAnswerComponent } from './assessment/questions/multiChoiceAnswer.component';
import { MultiChoiceQuestionComponent } from './assessment/questions/multiChoiceQuestion.component';
import { WeightedMultiChoiceAnswerComponent } from './assessment/questions/weightedMultiChoiceAnswer.component';
import { ExamSectionComponent } from './assessment/sections/examSection.component';
import { ArchivedReviewsComponent } from './listing/categories/archived.component';
import { GradedReviewsComponent } from './listing/categories/graded.component';
import { GradedLoggedReviewsComponent } from './listing/categories/gradedLogged.component';
import { InLanguageInspectionReviewsComponent } from './listing/categories/inLanguageInspection.component';
import { InProgressReviewsComponent } from './listing/categories/inProgress.component';
import { RejectedReviewsComponent } from './listing/categories/rejected.component';
import { AbortedExamsComponent } from './listing/dialogs/abortedExams.component';
import { ArchiveDownloadComponent } from './listing/dialogs/archiveDownload.component';
import { SpeedReviewFeedbackComponent } from './listing/dialogs/feedback.component';
import { NoShowsComponent } from './listing/dialogs/noShows.component';
import { ReviewListComponent } from './listing/reviewList.component';
import { ReviewListService } from './listing/reviewList.service';
import { SpeedReviewComponent } from './listing/speedReview.component';
import { ExamSummaryComponent } from './listing/summary/examSummary.component';
import { EssayAnswerComponent } from './questions/assessment/essayAnswer.component';
import { EssayAnswerListComponent } from './questions/assessment/essayAnswers.component';
import { QuestionAssessmentComponent } from './questions/assessment/questionAssessment.component';
import { QuestionFlowComponent } from './questions/flow/questionFlow.component';
import { QuestionFlowCategoryComponent } from './questions/flow/questionFlowCategory.component';
import { QuestionReviewComponent } from './questions/listing/questionReview.component';
import { QuestionReviewsComponent } from './questions/listing/questionReviews.component';
import { QuestionReviewService } from './questions/questionReview.service';

@NgModule({
    imports: [NgbModule, UIRouterModule, UtilityModule, DragDropModule],
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
    entryComponents: [
        AssessmentComponent,
        NoShowsComponent,
        AbortedExamsComponent,
        ArchiveDownloadComponent,
        SpeedReviewFeedbackComponent,
        InspectionCommentDialogComponent,
    ],
    providers: [
        AssessmentService,
        CollaborativeAssesmentService,
        ReviewListService,
        MaturityService,
        QuestionReviewService,
    ],
})
export class ReviewModule {}
