import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { FormGroup } from '@angular/forms';
import { tap } from 'rxjs/operators';

import { QuestionControlService } from './questionControl.service';
import type { QuestionBase } from './questionTypes';

@Component({
    selector: 'dynamic-form',
    templateUrl: './dynamicForm.component.html',
})
export class DynamicFormComponent implements OnInit {
    @Input() questions: QuestionBase<string>[] = [];
    @Output() answered = new EventEmitter<{ payload: string }>();

    form: FormGroup;

    constructor(private qcs: QuestionControlService) {}

    ngOnInit() {
        this.form = this.qcs.toFormGroup(this.questions);
        this.form.valueChanges.pipe(tap((c) => console.log(JSON.stringify(c))));
    }

    onSubmit() {
        const inputs = Object.keys(this.form.getRawValue())
            .filter((k) => k.length > 1)
            .map((k) => ({
                id: k,
                answer: this.form.getRawValue()[k],
            }));

        this.answered.emit({ payload: JSON.stringify(inputs) });
    }
}
