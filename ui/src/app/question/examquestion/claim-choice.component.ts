// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, model, output } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimChoiceComponent {
    options = model.required<ExamSectionQuestionOption[]>();
    lotteryOn = input(false);
    optionsChanged = output<ExamSectionQuestionOption[]>(); // optional output to emit updated options
    missingOptions = computed<string[]>(() =>
        this.QuestionService.getInvalidDistributedClaimOptionTypes(this.options())
            .filter((type) => type !== 'SkipOption')
            .map((optionType) => this.QuestionService.getOptionTypeTranslation(optionType)),
    );

    private QuestionService = inject(QuestionService);

    updateText(text: string, index: number) {
        const currentOptions = this.options();
        const updatedOptions = currentOptions.map((opt, i) => {
            if (i === index && opt.option) {
                return {
                    ...opt,
                    option: { ...opt.option, option: text },
                };
            }
            return opt;
        });
        this.options.set(updatedOptions);
        this.optionsChanged.emit(updatedOptions);
    }

    updateScore(score: number, index: number) {
        const currentOptions = this.options();
        const updatedOptions = currentOptions.map((opt, i) => (i === index ? { ...opt, score } : opt));
        this.options.set(updatedOptions);
        this.optionsChanged.emit(updatedOptions);
    }

    determineOptionType(option: ExamSectionQuestionOption) {
        return this.QuestionService.determineClaimOptionTypeForExamQuestionOption(option);
    }

    translateDescription(option: ExamSectionQuestionOption) {
        const optionType = this.determineOptionType(option);
        if (!optionType) {
            return '';
        }
        return this.QuestionService.determineOptionDescriptionTranslation(optionType);
    }

    getOptionClass(option: ExamSectionQuestionOption) {
        const optionType = this.determineOptionType(option);
        if (!optionType) {
            return '';
        }
        return this.QuestionService.determineClaimChoiceOptionClass(optionType);
    }
}
