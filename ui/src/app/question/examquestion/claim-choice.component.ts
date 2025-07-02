// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, UpperCasePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExamSectionQuestionOption } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';

@Component({
    selector: 'xm-eq-claim-choice',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    imports: [FormsModule, NgClass, NgbPopoverModule, TranslateModule, UpperCasePipe],
    styleUrls: ['../question.shared.scss'],
    templateUrl: './claim-choice.component.html',
})
export class ClaimChoiceComponent {
    options = input<ExamSectionQuestionOption[]>([]);
    lotteryOn = input(false);
    optionsChanged = output<ExamSectionQuestionOption[]>();

    missingOptions = computed<string[]>(() =>
        this.QuestionService.getInvalidDistributedClaimOptionTypes(this.options())
            .filter((type) => type !== 'SkipOption')
            .map((optionType) => this.QuestionService.getOptionTypeTranslation(optionType)),
    );

    constructor(private QuestionService: QuestionService) {}

    updateText = (text: string, index: number) => {
        const newOption = { ...this.options()[index].option, option: text };
        const next = this.options();
        next[index].option = newOption;
        this.optionsChanged.emit(next);
    };

    updateScore = (score: number, index: number) => {
        const newOption = { ...this.options()[index], score: score };
        const next = this.options();
        next[index] = newOption;
        this.optionsChanged.emit(next);
    };

    determineOptionType = (option: ExamSectionQuestionOption) =>
        this.QuestionService.determineClaimOptionTypeForExamQuestionOption(option);

    translateDescription = (option: ExamSectionQuestionOption) => {
        const optionType = this.determineOptionType(option);
        if (!optionType) {
            return '';
        }
        return this.QuestionService.determineOptionDescriptionTranslation(optionType);
    };

    getOptionClass = (option: ExamSectionQuestionOption) => {
        const optionType = this.determineOptionType(option);
        if (!optionType) {
            return '';
        }
        return this.QuestionService.determineClaimChoiceOptionClass(optionType);
    };
}
