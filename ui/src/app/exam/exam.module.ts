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

import { QuestionModule } from '../question/question.module';
import { ReviewModule } from '../review/review.module';
import { UtilityModule } from '../utility/utility.module';
import { CollaborativeExamService } from './collaborative/collaborativeExam.service';
import { CollaborativeExamListingComponent } from './collaborative/collaborativeExamListing.component';
import { BasicExamInfoComponent } from './editor/basic/basicExamInfo.component';
import { ExamCourseComponent } from './editor/basic/examCourse.component';
import { ExamInspectorSelectorComponent } from './editor/basic/examInspectorSelector.component';
import { ExamOwnerSelectorComponent } from './editor/basic/examOwnerSelector.component';
import { SoftwareSelectorComponent } from './editor/basic/softwareSelector.component';
import { CoursePickerComponent } from './editor/common/coursePicker.component';
import { CoursePickerService } from './editor/common/coursePicker.service';
import { ExaminationTypeSelectorComponent } from './editor/common/examinationTypeSelector.component';
import { LanguageSelectorComponent } from './editor/common/languageSelector.component';
import { CourseSelectionComponent } from './editor/creation/courseSelection.component';
import { NewExamComponent } from './editor/creation/newExam.component';
import { ExaminationEventDialogComponent } from './editor/events/examinationEventDialog.component';
import { ExamTabsComponent } from './editor/examTabs.component';
import { ExamTabService } from './editor/examTabs.service';
import { AutoEvaluationComponent } from './editor/publication/autoEvaluation.component';
import { CollaborativeExamOwnerSelectorComponent } from './editor/publication/collaborativeExamOwnerSelector.component';
import { ExamParticipantSelectorComponent } from './editor/publication/examParticipantSelector.component';
import { ExamPreParticipantSelectorComponent } from './editor/publication/examPreParticipantSelector.component';
import { ExamPublicationComponent } from './editor/publication/examPublication.component';
import { PublicationDialogComponent } from './editor/publication/publicationDialog.component';
import { PublicationErrorDialogComponent } from './editor/publication/publicationErrorDialog.component';
import { PublicationRevocationDialogComponent } from './editor/publication/publicationRevocationDialog.component';
import { ExamMaterialComponent } from './editor/sections/examMaterial.component';
import { ExamMaterialSelectorComponent } from './editor/sections/examMaterialSelector.component';
import { SectionComponent } from './editor/sections/section.component';
import { SectionQuestionComponent } from './editor/sections/sectionQuestion.component';
import { SectionsListComponent } from './editor/sections/sectionsList.component';
import { ExamService } from './exam.service';
import { ExamListingComponent } from './listing/examList.component';
import { PrintoutComponent } from './printout/printout.component';
import { PrintoutListingComponent } from './printout/printoutListing.component';

@NgModule({
    imports: [NgbModule, UtilityModule, ReviewModule, DragDropModule, UIRouterModule, QuestionModule],
    declarations: [
        BasicExamInfoComponent,
        ExamPublicationComponent,
        ExamCourseComponent,
        AutoEvaluationComponent,
        SectionsListComponent,
        NewExamComponent,
        SectionComponent,
        CoursePickerComponent,
        CourseSelectionComponent,
        LanguageSelectorComponent,
        ExamParticipantSelectorComponent,
        ExamOwnerSelectorComponent,
        ExamInspectorSelectorComponent,
        CollaborativeExamOwnerSelectorComponent,
        CollaborativeExamListingComponent,
        PublicationDialogComponent,
        PublicationErrorDialogComponent,
        PublicationRevocationDialogComponent,
        SoftwareSelectorComponent,
        ExamPreParticipantSelectorComponent,
        ExamMaterialComponent,
        ExamMaterialSelectorComponent,
        SectionComponent,
        SectionQuestionComponent,
        ExamTabsComponent,
        ExaminationEventDialogComponent,
        ExamListingComponent,
        PrintoutComponent,
        PrintoutListingComponent,
        ExaminationTypeSelectorComponent,
    ],
    bootstrap: [
        PublicationDialogComponent,
        PublicationErrorDialogComponent,
        PublicationRevocationDialogComponent,
        ExaminationEventDialogComponent,
        ExamMaterialComponent,
        ExaminationTypeSelectorComponent,
    ],
    providers: [ExamService, CoursePickerService, CollaborativeExamService, ExamTabService],
})
export class ExamModule {}
