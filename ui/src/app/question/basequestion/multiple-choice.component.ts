// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
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
})
export class MultipleChoiceEditorComponent implements OnInit {
    @Input() question!: Question | QuestionDraft;
    @Input() showWarning = false;
    @Input() lotteryOn = false;
    @Input() allowOptionRemoval = false;

    constructor(
        private translate: TranslateService,
        private toast: ToastrService,
        private QuestionScore: QuestionScoringService,
    ) {}

    ngOnInit() {
        if (this.question.type === 'WeightedMultipleChoiceQuestion') {
            delete this.question.defaultMaxScore;
        }
    }
    addNewOption = () => {
        if (this.lotteryOn) {
            this.toast.error(this.translate.instant('i18n_action_disabled_lottery_on'));
            return;
        }
        const option: MultipleChoiceOption = {
            option: '',
            correctOption: false,
            defaultScore: 0,
        };
        this.question.options.push(option);
    };

    calculateDefaultMaxPoints = () => this.QuestionScore.calculateDefaultMaxPoints(this.question as Question);
    calculateDefaultMinPoints = () => this.QuestionScore.calculateDefaultMinPoints(this.question as Question);
}
