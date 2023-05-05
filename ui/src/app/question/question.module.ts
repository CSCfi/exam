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
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '../shared/shared.module';
import { ClaimChoiceEditorComponent } from './basequestion/claim-choice.component';
import { EssayEditorComponent } from './basequestion/essay.component';
import { MultipleChoiceOptionEditorComponent } from './basequestion/multiple-choice-option.component';
import { MultipleChoiceEditorComponent } from './basequestion/multiple-choice.component';
import { QuestionBodyComponent } from './basequestion/question-body.component';
import { QuestionComponent } from './basequestion/question.component';
import { WeightedMultipleChoiceOptionEditorComponent } from './basequestion/weighted-multiple-choice-option.component';
import { BaseQuestionEditorComponent } from './examquestion/base-question-editor.component';
import { ExamQuestionEditorComponent } from './examquestion/exam-question-editor.component';
import { ExamQuestionComponent } from './examquestion/exam-question.component';
import { LibraryFileExportComponent } from './library/export/library-file-export.component';
import { LibraryTransferComponent } from './library/export/library-transfer.component';
import { LibraryComponent } from './library/library.component';
import { LibraryService } from './library/library.service';
import { LibraryOwnersComponent } from './library/owners/library-owners.component';
import { LibraryResultsComponent } from './library/results/library-results.component';
import { LibrarySearchComponent } from './library/search/library-search.component';
import { QuestionSelectorComponent } from './picker/question-picker.component';
import { QuestionService } from './question.service';
import { TagPickerComponent } from './tags/tag-picker.component';

@NgModule({
    imports: [SharedModule, NgbModule, RouterModule],
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
