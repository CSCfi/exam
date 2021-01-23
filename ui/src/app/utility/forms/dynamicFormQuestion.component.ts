import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { QuestionBase } from './questionTypes';

@Component({
    selector: 'dynamic-form-question',
    templateUrl: './dynamicFormQuestion.component.html',
})
export class DynamicFormQuestionComponent {
    @Input() question: QuestionBase<string>;
    @Input() form: FormGroup;
    get isValid() {
        return this.form.controls[this.question.key].valid;
    }
}
