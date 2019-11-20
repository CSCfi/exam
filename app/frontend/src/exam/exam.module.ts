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
import { CoursePickerComponent } from './editor/common/coursePicker.component';
import { CoursePickerService } from './editor/common/coursePicker.service';
import { LanguageSelectorComponent } from './editor/common/languageSelector.component';
import { CourseSelectionComponent } from './editor/creation/courseSelection.component';
import { NewExamComponent } from './editor/creation/newExam.component';
import { AutoEvaluationComponent } from './editor/publication/autoEvaluation.component';
import { CollaborativeExamOwnerSelectorComponent } from './editor/publication/collaborativeExamOwnerSelector.component';
import { ExamParticipantSelectorComponent } from './editor/publication/examParticipantSelector.component';
import { SectionComponent } from './editor/sections/section.component.upgrade';
import { SectionsListComponent } from './editor/sections/sectionsList.component';
import { ExamService } from './exam.service';

@NgModule({
    imports: [NgbModule, OrderModule, UtilityModule],
    declarations: [
        AutoEvaluationComponent,
        SectionsListComponent,
        NewExamComponent,
        SectionComponent,
        CoursePickerComponent,
        CourseSelectionComponent,
        LanguageSelectorComponent,
        ExamParticipantSelectorComponent,
        CollaborativeExamOwnerSelectorComponent,
    ],
    entryComponents: [
        AutoEvaluationComponent,
        CoursePickerComponent,
        CourseSelectionComponent,
        NewExamComponent,
        SectionsListComponent,
        LanguageSelectorComponent,
        ExamParticipantSelectorComponent,
        CollaborativeExamOwnerSelectorComponent,
    ],
    providers: [ExamService, CoursePickerService, CollaborativeExamService],
})
export class ExamModule {}
