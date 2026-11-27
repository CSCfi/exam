// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    input,
    OnInit,
    output,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    ControlContainer,
    FormControl,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { QuestionDraft, ReverseQuestion, Tag } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import type { User } from 'src/app/session/session.model';
import { AdditionalInfoComponent } from './additional-info.component';
import { BasicInfoComponent } from './basic-info.component';
import { OwnersComponent } from './owners.component';
import { TagsComponent } from './tags.component';
import { ClaimChoiceComponent } from './types/claim-choice.component';
import { EssayComponent } from './types/essay.component';
import { MultipleChoiceComponent } from './types/multiple-choice.component';
import { WeightedMultipleChoiceComponent } from './types/weighted-multiple-choice.component';
import { UsageComponent } from './usage.component';

@Component({
    selector: 'xm-question-body',
    templateUrl: './question-body.component.html',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [
        ReactiveFormsModule,
        TranslateModule,
        ClaimChoiceComponent,
        EssayComponent,
        MultipleChoiceComponent,
        AdditionalInfoComponent,
        BasicInfoComponent,
        OwnersComponent,
        TagsComponent,
        UsageComponent,
        WeightedMultipleChoiceComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionBodyComponent implements OnInit {
    readonly question = input.required<ReverseQuestion | QuestionDraft>();
    readonly currentOwners = input<User[]>([]);
    readonly lotteryOn = input(false);
    readonly collaborative = input(false);
    readonly questionTypes = input<{ type: string; name: string }[]>([]);
    readonly newQuestion = input(false);

    readonly currentOwnersChange = output<User[]>();
    readonly tagsChange = output<Tag[]>();

    readonly examNames = computed(() => {
        const q = this.question();
        if (!q?.examSectionQuestions?.length) return [];
        const names = q.examSectionQuestions.map((s) => s.examSection.exam.name).filter((n): n is string => n != null);
        return names.filter((n, pos) => names.indexOf(n) === pos).sort();
    });
    readonly questionType = signal<string | null>(null);
    readonly multichoiceFeaturesOn = signal(false);

    readonly questionBodyForm: FormGroup;

    private readonly parentForm = inject(FormGroupDirective);
    private readonly Question = inject(QuestionService);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        this.Question.areNewFeaturesEnabled$().subscribe((data) => {
            this.multichoiceFeaturesOn.set(data.multichoiceFeaturesOn);
        });

        // Create form group for question details
        // defaultMaxScore is not required for WeightedMultipleChoiceQuestion and ClaimChoiceQuestion
        this.questionBodyForm = new FormGroup({
            defaultMaxScore: new FormControl<number | null>(null),
        });

        // Add to parent form
        this.parentForm.form.addControl('questionBody', this.questionBodyForm);
    }

    ngOnInit() {
        const questionValue = this.question();
        this.questionBodyForm.patchValue(
            { defaultMaxScore: questionValue.defaultMaxScore || null },
            { emitEvent: false },
        );
        const initialType = questionValue.type || null;
        this.questionType.set(initialType);
        this.updateDefaultMaxScoreValidators(initialType);
    }

    onFormReady(form: FormGroup) {
        const ctrl = form.get('questionType');
        if (!ctrl) return;
        ctrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((type: string | null) => {
            this.questionType.set(type);
            this.updateDefaultMaxScoreValidators(type);
        });
    }

    private updateDefaultMaxScoreValidators(questionType: string | null): void {
        const defaultMaxScoreControl = this.questionBodyForm.get('defaultMaxScore');
        if (!defaultMaxScoreControl) return;

        // Required for all types except WeightedMultipleChoiceQuestion and ClaimChoiceQuestion
        if (questionType === 'WeightedMultipleChoiceQuestion' || questionType === 'ClaimChoiceQuestion') {
            defaultMaxScoreControl.clearValidators();
        } else {
            defaultMaxScoreControl.setValidators([Validators.required]);
        }
        defaultMaxScoreControl.updateValueAndValidity({ emitEvent: false });
    }
}
