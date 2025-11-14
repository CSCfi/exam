// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import {
    ControlContainer,
    FormControl,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { QuestionDraft, ReverseQuestion } from 'src/app/question/question.model';
import { CKEditorComponent } from 'src/app/shared/ckeditor/ckeditor.component';

@Component({
    selector: 'xm-question-basic-info',
    templateUrl: './basic-info.component.html',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, TranslateModule, CKEditorComponent, UpperCasePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicInfoComponent implements AfterViewInit {
    question = input<ReverseQuestion | QuestionDraft>();
    questionTypes = input<{ type: string; name: string }[]>([]);
    questionId = input<number>();
    formReady = output<FormGroup>();
    newText = output<string>();

    baseInformationForm: FormGroup;
    private parentForm = inject(FormGroupDirective);
    private questionTypeControl = new FormControl<string>('');

    constructor() {
        this.baseInformationForm = new FormGroup({
            questionType: this.questionTypeControl,
            questionText: new FormControl<string>('', [Validators.required]),
        });

        // Sync form from question data when available
        effect(() => {
            const questionValue = this.question();
            if (questionValue && this.baseInformationForm.pristine) {
                this.baseInformationForm.patchValue(
                    {
                        questionType: questionValue.type || '',
                        questionText: questionValue.question || '',
                    },
                    { emitEvent: false },
                );

                // Set validators based on whether question has a type
                if (questionValue.type) {
                    // Existing question - type is set, no validator needed
                    this.questionTypeControl.clearValidators();
                } else {
                    // New question - type is required
                    this.questionTypeControl.setValidators([Validators.required]);
                }
                this.questionTypeControl.updateValueAndValidity({ emitEvent: false });
            }
        });
    }

    get form(): FormGroup {
        return this.baseInformationForm;
    }

    get questionType(): string | null {
        return this.baseInformationForm.get('questionType')?.value || this.question()?.type || null;
    }

    get questionText(): string {
        return this.baseInformationForm.get('questionText')?.value || '';
    }

    get hasQuestionType(): boolean {
        return !!this.questionType;
    }

    get isQuestionTextInvalid(): boolean {
        const questionTextControl = this.baseInformationForm.get('questionText');
        return !!(questionTextControl?.invalid && questionTextControl?.touched);
    }

    ngAfterViewInit() {
        this.formReady.emit(this.baseInformationForm);
        // Add to parent form - parent form is guaranteed to be initialized at this point
        this.parentForm.form.addControl('baseInformation', this.baseInformationForm);

        // Propagate valid state changes to parent form
        this.baseInformationForm.statusChanges.subscribe(() => {
            // Update parent form validity when child form validity changes
            this.parentForm.form.updateValueAndValidity({ emitEvent: false });
        });
    }

    onTextChange(text: string) {
        // Update form control - form is source of truth
        const questionTextControl = this.baseInformationForm.get('questionText');
        if (questionTextControl) {
            const currentValue = questionTextControl.value;
            questionTextControl.setValue(text, { emitEvent: false });
            // Mark control as touched so validation errors can be shown
            questionTextControl.markAsTouched();
            // Mark form as dirty since CKEditor doesn't trigger valueChanges with emitEvent: false
            // Only mark dirty if value actually changed
            if (currentValue !== text) {
                this.baseInformationForm.markAsDirty();
                // Update validity - use emitEvent: true for validity to propagate to parent
                questionTextControl.updateValueAndValidity({ emitEvent: true });
                // Emit newText output for compatibility (e.g., examquestion component)
                this.newText.emit(text);
            }
        }
    }
}
