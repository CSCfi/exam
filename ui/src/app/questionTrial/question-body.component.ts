// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { ControlContainer, FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionUsageComponent } from 'src/app/question/question-usage.component';
import type { QuestionDraft, ReverseQuestion, Tag } from 'src/app/question/question.model';
import type { User } from 'src/app/session/session.model';
import { EssayTrialComponent } from './essay.component';
import { QuestionAdditionalInfoTrialComponent } from './question-additional-info.component';
import { QuestionBasicInfoTrialComponent } from './question-basic-info.component';
import { QuestionOwnersTrialComponent } from './question-owners.component';
import { QuestionTagsTrialComponent } from './question-tags.component';

@Component({
    selector: 'xm-question-body-trial',
    standalone: true,
    templateUrl: './question-body.component.html',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [
        ReactiveFormsModule,
        TranslateModule,
        EssayTrialComponent,
        QuestionAdditionalInfoTrialComponent,
        QuestionBasicInfoTrialComponent,
        QuestionOwnersTrialComponent,
        QuestionTagsTrialComponent,
        QuestionUsageComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionBodyTrialComponent {
    question = input.required<ReverseQuestion | QuestionDraft>();
    currentOwners = input<User[]>([]);
    lotteryOn = input(false);
    collaborative = input(false);
    questionTypes = input<{ type: string; name: string }[]>([]);

    currentOwnersChange = output<User[]>();
    tagsChange = output<Tag[]>();

    questionBodyForm: FormGroup;
    examNames = signal<string[]>([]);

    private parentForm = inject(FormGroupDirective);

    constructor() {
        // Create form group for question body
        this.questionBodyForm = new FormGroup({
            defaultMaxScore: new FormControl<number | null>(null),
        });

        // Add to parent form
        this.parentForm.form.addControl('questionBody', this.questionBodyForm);

        // Initialize form from question data when available
        effect(() => {
            const questionValue = this.question();
            if (questionValue && this.questionBodyForm.pristine) {
                this.questionBodyForm.patchValue(
                    {
                        defaultMaxScore: questionValue.defaultMaxScore || null,
                    },
                    { emitEvent: false },
                );
            }

            // Initialize exam names from question's exam section questions
            if (questionValue?.examSectionQuestions?.length > 0) {
                const examNames = questionValue.examSectionQuestions
                    .map((s) => s.examSection.exam.name)
                    .filter((n): n is string => n !== null && n !== undefined);
                this.examNames.set(examNames.filter((n, pos) => examNames.indexOf(n) === pos).sort());
            } else {
                this.examNames.set([]);
            }
        });
    }
}
