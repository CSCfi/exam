import { Injectable } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { QuestionBase } from './questionTypes';

@Injectable()
export class QuestionControlService {
    toFormGroup(questions: QuestionBase<string>[]) {
        const group: any = {};

        questions.forEach(question => {
            group[question.key] = new FormControl(question.value || '');
        });
        return new FormGroup(group);
    }
}

/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at https://angular.io/license
*/
