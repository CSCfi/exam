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
import { UIRouterModule } from '@uirouter/angular';

import { UtilityModule } from '../utility/utility.module';
import { ClaimChoiceEditorComponent } from './basequestion/claimChoice.component';
import { EssayEditorComponent } from './basequestion/essay.component';
import { MultipleChoiceEditorComponent } from './basequestion/multipleChoice.component';
import { MultipleChoiceOptionEditorComponent } from './basequestion/multipleChoiceOption.component';
import { QuestionComponent } from './basequestion/question.component';
import { QuestionBodyComponent } from './basequestion/questionBody.component';
import { WeightedMultipleChoiceOptionEditorComponent } from './basequestion/weightedMultipleChoiceOption.component';
import { BaseQuestionEditorComponent } from './examquestion/baseQuestionEditor.component';
import { ExamQuestionComponent } from './examquestion/examQuestion.component';
import { ExamQuestionEditorComponent } from './examquestion/examQuestionEditor.component';
import { LibraryFileExportComponent } from './library/export/libraryFileExport.component';
import { LibraryTransferComponent } from './library/export/libraryTransfer.component';
import { LibraryComponent } from './library/library.component';
import { LibraryService } from './library/library.service';
import { LibraryOwnersComponent } from './library/owners/libraryOwners.component';
import { LibraryResultsComponent } from './library/results/libraryResults.component';
import { LibrarySearchComponent } from './library/search/librarySearch.component';
import { QuestionService } from './question.service';
import { QuestionSelectorComponent } from './selector/questionSelector.component';
import { TagPickerComponent } from './tags/tagPicker.component';

@NgModule({
    imports: [UtilityModule, NgbModule, UIRouterModule],
    declarations: [
        LibraryComponent,
        LibrarySearchComponent,
        LibraryResultsComponent,
        LibraryFileExportComponent,
        LibraryTransferComponent,
        QuestionComponent,
        QuestionBodyComponent,
        QuestionSelectorComponent,
        BaseQuestionEditorComponent,
        ExamQuestionComponent,
        ExamQuestionEditorComponent,
        LibraryOwnersComponent,
        ClaimChoiceEditorComponent,
        EssayEditorComponent,
        MultipleChoiceEditorComponent,
        MultipleChoiceOptionEditorComponent,
        WeightedMultipleChoiceOptionEditorComponent,
        TagPickerComponent,
    ],
    bootstrap: [QuestionSelectorComponent, BaseQuestionEditorComponent, ExamQuestionEditorComponent],
    providers: [LibraryService, QuestionService],
})
export class QuestionModule {}
