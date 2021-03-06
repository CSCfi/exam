/*
 * Copyright (c) 2020 Exam Consortium
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
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import * as toast from 'toastr';

import type { User } from '../../session/session.service';

import type { LibraryQuestion } from './library.service';

@Component({
    selector: 'library',
    templateUrl: './library.component.html',
})
export class LibraryComponent {
    questions: LibraryQuestion[] = [];
    selections: number[] = [];

    constructor(private state: StateService, private translate: TranslateService) {}

    resultsUpdated(results: LibraryQuestion[]) {
        this.questions = results;
    }

    questionSelected(selections: number[]) {
        this.selections = selections;
    }

    questionCopied(copy: LibraryQuestion) {
        toast.info(this.translate.instant('sitnet_question_copied'));
        this.state.go('question', { id: copy.id });
    }

    ownerSelected(event: { user: User; selections: number[] }) {
        const questions = this.questions.filter((q) => event.selections.indexOf(q.id) > -1);
        questions.forEach((q) => q.questionOwners.push(event.user));
    }
}
