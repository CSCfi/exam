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

import { UtilityModule } from '../utility/utility.module';
import { AssessmentService } from './assessment/assessment.service';
import { CollaborativeAssesmentService } from './assessment/collaborativeAssessment.service';
import { FeedbackComponent } from './assessment/feedback/feedback.component';
import { GradingComponent } from './assessment/grading/grading.component';
import { InspectionComponent } from './assessment/grading/inspection.component';
import { ToolbarComponent } from './assessment/grading/toolbar.component';
import { ReviewListComponent } from './listing/reviewList.component.upgrade';
import { ReviewListService } from './listing/reviewList.service';
import { ExamSummaryComponent } from './listing/summary/examSummary.component.upgrade';
import { QuestionReviewsComponent } from './questions/listing/questionReviews.component.upgrade';

@NgModule({
    imports: [NgbModule, UtilityModule, DragDropModule],
    exports: [ReviewListComponent, QuestionReviewsComponent, ExamSummaryComponent],
    declarations: [
        FeedbackComponent,
        GradingComponent,
        InspectionComponent,
        ToolbarComponent,
        ReviewListComponent,
        QuestionReviewsComponent,
        ExamSummaryComponent,
    ],
    entryComponents: [FeedbackComponent, GradingComponent],
    providers: [AssessmentService, CollaborativeAssesmentService, ReviewListService],
})
export class ReviewModule {}
