/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TransitionService } from '@uirouter/core';
import * as toast from 'toastr';

import { AttachmentService } from '../../utility/attachment/attachment.service';
import { ConfirmationDialogService } from '../../utility/dialogs/confirmationDialog.service';
import { WindowRef } from '../../utility/window/window.service';
import { QuestionService } from '../question.service';

import type {
    ExamSectionQuestion,
    ExamSectionQuestionOption,
    MultipleChoiceOption,
    Question,
    ReverseQuestion,
} from '../../exam/exam.model';

type EditableExamSectionQuestionOption = Omit<ExamSectionQuestionOption, 'option'> & {
    option: Partial<MultipleChoiceOption>;
};

type EditableExamSectionQuestion = Omit<ExamSectionQuestion, 'options'> & {
    options: Partial<EditableExamSectionQuestionOption>[];
};

// This component depicts a distributed exam question
@Component({
    selector: 'exam-question',
    templateUrl: './examQuestion.component.html',
})
export class ExamQuestionComponent {
    @Input() examQuestion: EditableExamSectionQuestion;
    @Input() lotteryOn: boolean;
    @Output() onSave = new EventEmitter<{ question: Question; examQuestion: ExamSectionQuestion }>();
    @Output() onCancel = new EventEmitter<void>();

    question?: ReverseQuestion;
    transitionWatcher?: unknown;
    examNames: string[] = [];
    sectionNames: string[] = [];
    missingOptions: string[] = [];
    isInPublishedExam: boolean;

    constructor(
        private http: HttpClient,
        private transition: TransitionService,
        private translate: TranslateService,
        private Question: QuestionService,
        private Window: WindowRef,
        private Attachment: AttachmentService,
        private Confirmation: ConfirmationDialogService,
    ) {
        this.transitionWatcher = this.transition.onBefore({}, () => {
            if (this.Window.nativeWindow.onbeforeunload) {
                // we got changes in the model, ask confirmation
                return this.Confirmation.open(
                    this.translate.instant('sitnet_confirm_exit'),
                    this.translate.instant('sitnet_unsaved_question_data'),
                ).result.then(() => {
                    // ok to reroute
                    this.Window.nativeWindow.onbeforeunload = null;
                    delete this.transitionWatcher;
                });
            } else {
                this.Window.nativeWindow.onbeforeunload = null;

                return true;
            }
        });
    }

    ngOnInit() {
        this.init();
    }

    save = () => {
        this.Window.nativeWindow.onbeforeunload = null;
        this.onSave.emit({
            question: this.question as ReverseQuestion,
            examQuestion: this.examQuestion as ExamSectionQuestion,
        });
    };

    cancel = () => {
        this.Window.nativeWindow.onbeforeunload = null;
        this.onCancel.emit();
    };

    private init = () =>
        this.http.get<ReverseQuestion>(`/app/questions/${this.examQuestion.question.id}`).subscribe((question) => {
            this.question = question;
            const sections = this.question.examSectionQuestions.map((esq) => esq.examSection);
            const examNames = sections.map((s) => {
                if (s.exam.state === 'PUBLISHED') {
                    this.isInPublishedExam = true;
                }
                return s.exam.name as string;
            });
            const sectionNames = sections.map((s) => s.name);
            // remove duplicates
            this.examNames = examNames.filter((n, pos) => examNames.indexOf(n) === pos);
            this.sectionNames = sectionNames.filter((n, pos) => sectionNames.indexOf(n) === pos);
            this.validate();
        });

    showWarning = () => this.examNames && this.examNames.length > 1;
    estimateCharacters = () => (this.examQuestion.expectedWordCount || 0) * 8;

    removeOption = (selectedOption: ExamSectionQuestionOption) => {
        if (this.lotteryOn) {
            toast.error(this.translate.instant('sitnet_action_disabled_lottery_on'));
            return;
        }

        const hasCorrectAnswer =
            this.examQuestion.options.filter(
                (o) =>
                    o.id !== selectedOption.id &&
                    (o.option?.correctOption || (o.option?.defaultScore && o.option.defaultScore > 0)),
            ).length > 0;

        // Either not published exam or correct answer exists
        if (!this.isInPublishedExam || hasCorrectAnswer) {
            this.examQuestion.options.splice(this.examQuestion.options.indexOf(selectedOption), 1);
        } else {
            toast.error(this.translate.instant('sitnet_action_disabled_minimum_options'));
        }
    };

    addNewOption = () => {
        if (this.lotteryOn) {
            toast.error(this.translate.instant('sitnet_action_disabled_lottery_on'));
            return;
        }
        this.examQuestion.options.push({ option: { correctOption: false } });
    };

    correctAnswerToggled = (option: ExamSectionQuestionOption) =>
        this.Question.toggleCorrectOption(
            option.option,
            this.examQuestion.options.map((o) => o.option) as MultipleChoiceOption[],
        );

    optionDisabled = (option: ExamSectionQuestionOption) => option.option.correctOption;

    updateEvaluationType = () => {
        if (this.examQuestion.evaluationType && this.examQuestion.evaluationType === 'Selection') {
            this.examQuestion.maxScore = 0;
        }
    };

    selectFile = () =>
        this.Attachment.selectFile(true).then((data) => {
            if (!this.question) {
                return;
            }
            this.question.attachment = {
                ...this.question.attachment,
                modified: true,
                fileName: data.$value.attachmentFile.name,
                size: data.$value.attachmentFile.size,
                file: data.$value.attachmentFile,
                removed: false,
            };
        });

    downloadQuestionAttachment = () => this.Attachment.downloadQuestionAttachment(this.question as ReverseQuestion);

    removeQuestionAttachment = () => this.Attachment.removeQuestionAttachment(this.question as ReverseQuestion);

    getFileSize = () =>
        !this.question?.attachment?.file ? 0 : this.Attachment.getFileSize(this.question.attachment.file.size);

    calculateWeightedMaxPoints = () =>
        this.Question.calculateWeightedMaxPoints(this.examQuestion as ExamSectionQuestion);

    returnOptionClass = (option: ExamSectionQuestionOption) => {
        const optionType = this.determineOptionType(option);
        if (!optionType) {
            return;
        }
        return this.Question.returnClaimChoiceOptionClass(optionType);
    };

    determineOptionType = (option: ExamSectionQuestionOption) =>
        this.Question.determineClaimOptionTypeForExamQuestionOption(option);

    returnOptionDescriptionTranslation = (option: ExamSectionQuestionOption) => {
        const optionType = this.determineOptionType(option);
        if (!optionType) {
            return;
        }
        return this.Question.returnOptionDescriptionTranslation(optionType);
    };

    validate = () => {
        this.missingOptions = this.Question.getInvalidDistributedClaimOptionTypes(
            this.examQuestion.options as ExamSectionQuestionOption[],
        )
            .filter((type) => type !== 'SkipOption')
            .map((optionType) => this.Question.getOptionTypeTranslation(optionType));
    };

    errors = (status: unknown) => {
        return JSON.stringify(status);
    };

    hasInvalidClaimChoiceOptions = () =>
        this.examQuestion.question.type === 'ClaimChoiceQuestion' &&
        this.Question.getInvalidDistributedClaimOptionTypes(this.examQuestion.options as ExamSectionQuestionOption[])
            .length > 0;
}
