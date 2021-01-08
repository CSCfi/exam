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
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { OrderModule } from 'ngx-order-pipe';

import { UtilityModule } from '../utility/utility.module';
import { CollaborativeExamService } from './collaborative/collaborativeExam.service';
import { BasicExamInfoComponent } from './editor/basic/basicExamInfo.component';
import { ExamCourseComponent } from './editor/basic/examCourse.component';
import { ExamInspectorSelectorComponent } from './editor/basic/examInspectorSelector.component';
import { ExamOwnerSelectorComponent } from './editor/basic/examOwnerSelector.component';
import { SoftwareSelectorComponent } from './editor/basic/softwareSelector.component';
import { CoursePickerComponent } from './editor/common/coursePicker.component';
import { CoursePickerService } from './editor/common/coursePicker.service';
import { LanguageSelectorComponent } from './editor/common/languageSelector.component';
import { CourseSelectionComponent } from './editor/creation/courseSelection.component';
import { NewExamComponent } from './editor/creation/newExam.component';
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
import { SectionComponent } from './editor/sections/section.component.upgrade';
import { SectionsListComponent } from './editor/sections/sectionsList.component';
import { ExamService } from './exam.service';

@NgModule({
    imports: [NgbModule, OrderModule, UtilityModule],
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
        PublicationDialogComponent,
        PublicationErrorDialogComponent,
        PublicationRevocationDialogComponent,
        SoftwareSelectorComponent,
        ExamPreParticipantSelectorComponent,
        ExamMaterialComponent,
        ExamMaterialSelectorComponent,
    ],
    entryComponents: [BasicExamInfoComponent, ExamPublicationComponent, NewExamComponent, SectionsListComponent],
    providers: [ExamService, CoursePickerService, CollaborativeExamService],
})
export class ExamModule {}
