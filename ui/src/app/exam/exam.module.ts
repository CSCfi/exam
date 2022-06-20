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
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { QuestionModule } from '../question/question.module';
import { ReviewModule } from '../review/review.module';
import { SharedModule } from '../shared/shared.module';
import { CollaborativeExamListingComponent } from './collaborative/collaborative-exam-listing.component';
import { CollaborativeExamService } from './collaborative/collaborative-exam.service';
import { BasicExamInfoComponent } from './editor/basic/basic-exam-info.component';
import { ExamCourseComponent } from './editor/basic/exam-course.component';
import { ExamInspectorSelectorComponent } from './editor/basic/exam-inspector-picker.component';
import { ExamOwnerSelectorComponent } from './editor/basic/exam-owner-picker.component';
import { ExamResolverService } from './editor/basic/exam-resolver.service';
import { SoftwareSelectorComponent } from './editor/basic/software-picker.component';
import { CoursePickerComponent } from './editor/common/course-picker.component';
import { CoursePickerService } from './editor/common/course-picker.service';
import { ExaminationTypeSelectorComponent } from './editor/common/examination-type-picker.component';
import { LanguageSelectorComponent } from './editor/common/language-picker.component';
import { CourseSelectionComponent } from './editor/creation/course-selection.component';
import { NewExamComponent } from './editor/creation/new-exam.component';
import { ExaminationEventDialogComponent } from './editor/events/examination-event-dialog.component';
import { ExaminationEventSearchComponent } from './editor/events/examination-event-search.component';
import { ExamTabsComponent } from './editor/exam-tabs.component';
import { ExamTabService } from './editor/exam-tabs.service';
import { AutoEvaluationComponent } from './editor/publication/auto-evaluation.component';
import { CollaborativeExamOwnerSelectorComponent } from './editor/publication/collaborative-exam-owner-picker.component';
import { ExamParticipantSelectorComponent } from './editor/publication/exam-participant-picker.component';
import { ExamPreParticipantSelectorComponent } from './editor/publication/exam-pre-participant-picker.component';
import { ExamPublicationComponent } from './editor/publication/exam-publication.component';
import { OrganisationSelectorComponent } from './editor/publication/organisation-picker.component';
import { PublicationDialogComponent } from './editor/publication/publication-dialog.component';
import { PublicationErrorDialogComponent } from './editor/publication/publication-error-dialog.component';
import { PublicationRevocationDialogComponent } from './editor/publication/publication-revocation-dialog.component';
import { ExamMaterialSelectorComponent } from './editor/sections/exam-material-picker.component';
import { ExamMaterialComponent } from './editor/sections/exam-material.component';
import { SectionQuestionComponent } from './editor/sections/section-question.component';
import { SectionComponent } from './editor/sections/section.component';
import { SectionsComponent } from './editor/sections/sections.component';
import { ExamService } from './exam.service';
import { ExamListingComponent } from './listing/exam-list.component';
import { PrintoutComponent } from './printout/printout.component';
import { PrintoutListingComponent } from './printout/printouts.component';

@NgModule({
    imports: [NgbModule, SharedModule, ReviewModule, DragDropModule, RouterModule, QuestionModule],
    declarations: [
        BasicExamInfoComponent,
        ExamPublicationComponent,
        ExamCourseComponent,
        AutoEvaluationComponent,
        SectionsComponent,
        NewExamComponent,
        SectionComponent,
        CoursePickerComponent,
        CourseSelectionComponent,
        LanguageSelectorComponent,
        ExamParticipantSelectorComponent,
        ExamOwnerSelectorComponent,
        ExamInspectorSelectorComponent,
        CollaborativeExamOwnerSelectorComponent,
        OrganisationSelectorComponent,
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
        ExaminationEventSearchComponent,
    ],
    bootstrap: [
        PublicationDialogComponent,
        PublicationErrorDialogComponent,
        PublicationRevocationDialogComponent,
        ExaminationEventDialogComponent,
        ExamMaterialComponent,
        ExaminationTypeSelectorComponent,
    ],
    providers: [ExamService, CoursePickerService, CollaborativeExamService, ExamTabService, ExamResolverService],
})
export class ExamModule {}
