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
import { downgradeComponent, downgradeInjectable } from '@angular/upgrade/static';
import * as angular from 'angular';

import { AssessmentService } from './assessment/assessment.service';
import { CollaborativeAssesmentService } from './assessment/collaborativeAssessment.service';
import { FeedbackComponent } from './assessment/feedback/feedback.component';
import { GradingComponent } from './assessment/grading/grading.component';
import { ReviewListComponent } from './listing/reviewList.component';
import { ReviewListService } from './listing/reviewList.service';
import { QuestionReviewListComponent } from './questions/listing/questionReviews.component';

angular
    .module('app.review', [])
    .component('reviewList', ReviewListComponent)
    .component('questionReviews', QuestionReviewListComponent)
    .service('ReviewList', downgradeInjectable(ReviewListService))
    .service('Assessment', downgradeInjectable(AssessmentService))
    .service('CollaborativeAssessment', downgradeInjectable(CollaborativeAssesmentService))
    .directive('rFeedback', downgradeComponent({ component: FeedbackComponent }))
    .directive('rGrading', downgradeComponent({ component: GradingComponent }));
