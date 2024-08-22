// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, UpperCasePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamSectionQuestionOption } from 'src/app/question/question.model';

@Component({
    selector: 'xm-eq-unweighted-mc',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    standalone: true,
    imports: [FormsModule, NgClass, NgbPopoverModule, TranslateModule, UpperCasePipe],
    styleUrls: ['../question.shared.scss'],
    template: `
        <div ngModelGroup="unweightedMc" id="unweightedMc">
            @for (option of options(); track option.id; let index = $index) {
                <div class="row">
                    <div
                        class="col-md-6 question-option-empty"
                        [ngClass]="{ 'question-correct-option': option.option?.correctOption }"
                    >
                        @if (option.option) {
                            <textarea
                                id="optionText_{{ option.id }}"
                                name="optionText_{{ option.id }}"
                                type="text"
                                rows="1"
                                class="make-inline question-option-input radiobut form-control"
                                [ngModel]="option.option!.option"
                                (ngModelChange)="updateText($event, index)"
                                required
                            ></textarea>
                        }
                    </div>
                    <div
                        class="col-md-2 question-option-empty-radio"
                        [ngClass]="{ 'question-correct-option-radio': option.option?.correctOption }"
                    >
                        @if (option.option) {
                            <input
                                name="correctOption_{{ option.id }}"
                                type="radio"
                                [(ngModel)]="option.option!.correctOption"
                                [value]="true"
                                (click)="updateCorrectAnswer(index)"
                                [disabled]="optionDisabled(option)"
                                class="make-inline question-option-radio"
                            />
                        }
                    </div>
                    <div [hidden]="lotteryOn()" (click)="removeOption(option)" class="col-md-1 question-option-trash">
                        <i class="bi-trash" title="{{ 'i18n_remove' | translate }}"></i>
                    </div>
                </div>
            }
            <div class="row mt-2">
                <div class="col-md-12">
                    <a (click)="addNewOption()" class="attachment-link pointer">
                        <i class="bi-plus"></i>
                        {{ 'i18n_question_add_new_option' | translate }}
                    </a>
                </div>
            </div>
        </div>
    `,
})
export class MultiChoiceComponent {
    options = input<ExamSectionQuestionOption[]>([]);
    lotteryOn = input(false);
    isInPublishedExam = input(false);
    optionsChanged = output<ExamSectionQuestionOption[]>();

    constructor(
        private TranslateService: TranslateService,
        private ToastrService: ToastrService,
    ) {}

    updateCorrectAnswer = (index: number) => {
        const status = !this.options()[index].option.correctOption;
        const newOption = { ...this.options()[index].option, correctOption: status };
        const next = this.options();
        next[index].option = newOption;
        next.filter((o, i) => i != index).forEach((o) => (o.option.correctOption = false));
        this.optionsChanged.emit(next);
    };

    updateText = (text: string, index: number) => {
        const newOption = { ...this.options()[index].option, option: text };
        const next = this.options();
        next[index].option = newOption;
        this.optionsChanged.emit(next);
    };

    addNewOption = () => {
        if (this.lotteryOn()) {
            this.ToastrService.error(this.TranslateService.instant('i18n_action_disabled_lottery_on'));
            return;
        }
        const newOption: ExamSectionQuestionOption = {
            id: undefined,
            option: {
                correctOption: false,
                option: '',
                defaultScore: 0,
            },
            score: 0,
            answered: false,
        };
        this.optionsChanged.emit([...this.options(), newOption]);
    };

    removeOption = (option: ExamSectionQuestionOption) => {
        if (this.lotteryOn()) {
            this.ToastrService.error(this.TranslateService.instant('i18n_action_disabled_lottery_on'));
            return;
        }

        const hasCorrectAnswer =
            this.options().filter(
                (o) =>
                    o.id !== option.id &&
                    (o.option?.correctOption || (o.option?.defaultScore && o.option.defaultScore > 0)),
            ).length > 0;

        // Either not published exam or correct answer exists
        if (!this.isInPublishedExam() || hasCorrectAnswer) {
            this.optionsChanged.emit(this.options().filter((o) => o.id !== option.id));
        } else {
            this.ToastrService.error(this.TranslateService.instant('i18n_action_disabled_minimum_options'));
        }
    };

    optionDisabled = (option: ExamSectionQuestionOption) => option.option.correctOption;
}
