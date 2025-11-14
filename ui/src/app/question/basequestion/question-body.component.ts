// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    ChangeDetectionStrategy,
    Component,
    effect,
    inject,
    input,
    OnDestroy,
    output,
    signal,
    ViewChild,
} from '@angular/core';
import { ControlContainer, FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { QuestionUsageComponent } from 'src/app/question/question-usage.component';
import type { QuestionDraft, ReverseQuestion, Tag } from 'src/app/question/question.model';
import type { User } from 'src/app/session/session.model';
import { ClaimChoiceComponent } from './claim-choice.component';
import { EssayComponent } from './essay.component';
import { MultipleChoiceComponent } from './multiple-choice.component';
import { QuestionAdditionalInfoComponent } from './question-additional-info.component';
import { QuestionBasicInfoComponent } from './question-basic-info.component';
import { QuestionOwnersComponent } from './question-owners.component';
import { QuestionTagsComponent } from './question-tags.component';
import { WeightedMultipleChoiceComponent } from './weighted-multiple-choice.component';

@Component({
    selector: 'xm-question-body',
    standalone: true,
    templateUrl: './question-body.component.html',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [
        ReactiveFormsModule,
        TranslateModule,
        ClaimChoiceComponent,
        EssayComponent,
        MultipleChoiceComponent,
        QuestionAdditionalInfoComponent,
        QuestionBasicInfoComponent,
        QuestionOwnersComponent,
        QuestionTagsComponent,
        QuestionUsageComponent,
        WeightedMultipleChoiceComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionBodyComponent implements OnDestroy {
    @ViewChild('questionBasicInfo') questionBasicInfo!: QuestionBasicInfoComponent;
    question = input.required<ReverseQuestion | QuestionDraft>();
    currentOwners = input<User[]>([]);
    lotteryOn = input(false);
    collaborative = input(false);
    questionTypes = input<{ type: string; name: string }[]>([]);
    newQuestion = input(false);

    currentOwnersChange = output<User[]>();
    tagsChange = output<Tag[]>();

    questionBodyForm: FormGroup;
    examNames = signal<string[]>([]);
    questionType = signal<string | null>(null);

    private parentForm = inject(FormGroupDirective);
    private readonly ngUnsubscribe = new Subject<void>();

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
            this.questionType.set(questionValue.type || null);

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

    onFormReady(form: FormGroup) {
        form.valueChanges
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe((value) => this.questionType.set(value.questionType));
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }
}
