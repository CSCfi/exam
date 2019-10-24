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

require('./review.module.ajs.ts');

require('./assessment/assessment.service.ts');
require('./assessment/collaborativeAssessment.service.ts');
require('./assessment/assessment.component');

require('./assessment/feedback/feedback.component.ts');
require('./assessment/feedback/statement.component');

require('./assessment/general/generalInfo.component.ts');
require('./assessment/general/participation.component');

require('./assessment/grading/grading.component.ts');
require('./assessment/grading/inspection.component');
require('./assessment/grading/toolbar.component');

require('./assessment/maturity/maturity.service');
require('./assessment/maturity/grading.component');
require('./assessment/maturity/inspectionComments.component');
require('./assessment/maturity/toolbar.component');
require('./assessment/maturity/dialogs/inspectionComment.component');

require('./assessment/print/printedAssessment.component');
require('./assessment/print/printedSection.component');
require('./assessment/print/printedClozeTest.component');
require('./assessment/print/printedEssay.component');
require('./assessment/print/printedMultiChoice.component');

require('./assessment/questions/clozeTest.component');
require('./assessment/questions/essayQuestion.component');
require('./assessment/questions/multiChoiceQuestion.component');
require('./assessment/questions/multiChoiceAnswer.component');
require('./assessment/questions/weightedMultiChoiceAnswer.component');

require('./assessment/sections/examSection.component');

require('./listing/reviewList.service');
require('./listing/reviewList.component.ts');
require('./listing/speedReview.component');
require('./listing/dialogs/abortedExams.component.ts');
require('./listing/dialogs/archiveDownload.component');
require('./listing/dialogs/feedback.component.ts');
require('./listing/dialogs/noShows.component');

require('./listing/categories/archived.component');
require('./listing/categories/inProgress.component');
require('./listing/categories/inLanguageInspection.component');
require('./listing/categories/graded.component');
require('./listing/categories/gradedLogged.component');
require('./listing/categories/rejected.component');

require('./review.model.ts');
require('./questions/questionReview.service.ts');
require('./questions/assessment/questionAssessment.component.ts');
require('./questions/assessment/essayAnswer.component.ts');
require('./questions/assessment/essayAnswers.component.ts');

require('./questions/flow/questionFlow.component.ts');
require('./questions/flow/questionFlowCategory.component.ts');

require('./questions/listing/questionReview.component.ts');
require('./questions/listing/questionReviews.component.ts');

require('./listing/summary/examSummary.component.ts');
