// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { Component, inject, input, model } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamSectionQuestion, ExamSectionQuestionOption } from 'src/app/question/question.model';

@Component({
    selector: 'xm-eq-unweighted-mc',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    imports: [FormsModule, NgClass, NgbPopoverModule, TranslateModule],
    styleUrls: ['../question.shared.scss'],
    template: `
        @if (question(); as q) {
            <div ngModelGroup="unweightedMc" id="unweightedMc">
                <div class="row my-2">
                    <div class="col-md-12">
                        <div class="form-check">
                            <input
                                class="form-check-input"
                                name="optionShuffling"
                                type="checkbox"
                                [ngModel]="q.optionShufflingOn"
                                (ngModelChange)="updateShufflingSetting($event)"
                                id="optionShuffling"
                            />
                            <label class="form-check-label" for="optionShuffling">{{
                                'i18n_shuffle_options' | translate
                            }}</label>
                        </div>
                    </div>
                </div>

                @for (option of q.options; track option.id; let index = $index) {
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
                        <button
                            [hidden]="lotteryOn()"
                            (click)="removeOption(option)"
                            class="col-md-1 question-option-trash btn btn-link"
                        >
                            <i class="bi-trash" title="{{ 'i18n_remove' | translate }}"></i>
                        </button>
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
        }
    `,
})
export class MultiChoiceComponent {
    question = model.required<ExamSectionQuestion>();
    lotteryOn = input(false);
    isInPublishedExam = input(false);

    private TranslateService = inject(TranslateService);
    private ToastrService = inject(ToastrService);

    updateCorrectAnswer = (index: number) => {
        const status = !this.question().options[index].option.correctOption;
        const next = this.question().options.map((opt, i) =>
            i === index
                ? { ...opt, option: { ...opt.option, correctOption: status } }
                : { ...opt, option: { ...opt.option, correctOption: false } },
        );
        this.question.update((q) => ({ ...q, options: next }));
    };

    updateText = (text: string, index: number) => {
        const next = [...this.question().options];
        next[index] = { ...next[index], option: { ...next[index].option, option: text } };
        this.question.update((q) => ({ ...q, options: next }));
    };

    updateShufflingSetting = (setting: boolean) => {
        this.question.update((q) => ({ ...q, optionShufflingOn: setting }));
    };

    addNewOption = () => {
        if (this.lotteryOn()) {
            this.ToastrService.error(this.TranslateService.instant('i18n_action_disabled_lottery_on'));
            return;
        }
        const newOption: ExamSectionQuestionOption = {
            id: -(Date.now() + Math.random()),
            option: {
                correctOption: false,
                option: '',
                defaultScore: 0,
            },
            score: 0,
            answered: false,
        };
        const next = [...this.question().options, newOption];
        this.question.update((q) => ({ ...q, options: next }));
    };

    removeOption = (option: ExamSectionQuestionOption) => {
        if (this.lotteryOn()) {
            this.ToastrService.error(this.TranslateService.instant('i18n_action_disabled_lottery_on'));
            return;
        }

        const hasCorrectAnswer =
            this.question().options.filter(
                (o) =>
                    o.id !== option.id &&
                    (o.option?.correctOption || (o.option?.defaultScore && o.option.defaultScore > 0)),
            ).length > 0;

        // Either not published exam or correct answer exists
        if (!this.isInPublishedExam() || hasCorrectAnswer) {
            const next = this.question().options.filter((o) => o.id !== option.id);
            this.question.update((q) => ({ ...q, options: next }));
        } else {
            this.ToastrService.error(this.TranslateService.instant('i18n_action_disabled_minimum_options'));
        }
    };

    optionDisabled = (option: ExamSectionQuestionOption) => option.option.correctOption;
}
