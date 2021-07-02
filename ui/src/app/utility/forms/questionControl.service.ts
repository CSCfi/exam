import { Injectable } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import type { QuestionBase } from './questionTypes';

@Injectable()
export class QuestionControlService {
    toFormGroup(questions: QuestionBase<string>[]) {
        const group: Record<string, FormControl> = {};

        questions.forEach((question) => {
            group[question.key] = new FormControl(question.value || '');
        });
        return new FormGroup(group);
    }
}
