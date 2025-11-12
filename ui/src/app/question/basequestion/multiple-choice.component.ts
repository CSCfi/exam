// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { MultipleChoiceOption, Question, QuestionDraft } from 'src/app/question/question.model';
import { MultipleChoiceOptionEditorComponent } from './multiple-choice-option.component';
import { WeightedMultipleChoiceOptionEditorComponent } from './weighted-multiple-choice-option.component';

@Component({
    selector: 'xm-multiple-choice-editor',
    templateUrl: './multiple-choice.component.html',
    styleUrls: ['../question.shared.scss'],
    imports: [
        FormsModule,
        MultipleChoiceOptionEditorComponent,
        WeightedMultipleChoiceOptionEditorComponent,
        UpperCasePipe,
        TranslateModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultipleChoiceEditorComponent {
    question = input.required<Question | QuestionDraft>();
    showWarning = input(false);
    lotteryOn = input(false);
    allowOptionRemoval = input(false);

    questionChange = output<Question | QuestionDraft>();

    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private QuestionScore = inject(QuestionScoringService);

    constructor() {
        // Delete defaultMaxScore for weighted multiple choice questions
        effect(() => {
            const questionValue = this.question();
            if (questionValue.type === 'WeightedMultipleChoiceQuestion') {
                delete questionValue.defaultMaxScore;
            }
        });
    }

    addNewOption() {
        if (this.lotteryOn()) {
            this.toast.error(this.translate.instant('i18n_action_disabled_lottery_on'));
            return;
        }
        const questionValue = this.question();
        const option: MultipleChoiceOption = {
            option: '',
            correctOption: false,
            defaultScore: 0,
        };
        const updatedQuestion = {
            ...questionValue,
            options: [...questionValue.options, option],
        };
        this.questionChange.emit(updatedQuestion);
    }

    setDefaultNegativeScoreAllowed(value: boolean) {
        const questionValue = this.question();
        questionValue.defaultNegativeScoreAllowed = value;
    }

    setDefaultOptionShufflingOn(value: boolean) {
        const questionValue = this.question();
        questionValue.defaultOptionShufflingOn = value;
    }

    calculateDefaultMaxPoints() {
        return this.QuestionScore.calculateDefaultMaxPoints(this.question() as Question);
    }

    calculateDefaultMinPoints() {
        return this.QuestionScore.calculateDefaultMinPoints(this.question() as Question);
    }
}
