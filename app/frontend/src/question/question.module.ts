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
import { QuestionComponent } from './basequestion/question.component';
import { QuestionBodyComponent } from './basequestion/questionBody.component.upgrade';
import { LibraryService } from './library/library.service';
import { LibraryResultsComponent } from './library/results/libraryResults.component';
import { LibrarySearchComponent } from './library/search/librarySearch.component';
import { QuestionService } from './question.service';

@NgModule({
    imports: [UtilityModule, NgbModule, OrderModule],
    declarations: [LibrarySearchComponent, LibraryResultsComponent, QuestionComponent, QuestionBodyComponent],
    entryComponents: [LibrarySearchComponent, LibraryResultsComponent, QuestionComponent],
    providers: [LibraryService, QuestionService],
})
export class QuestionModule {}
