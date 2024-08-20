// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbModal, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type {
    ExamSectionQuestion,
    ExamSectionQuestionOption,
    MultipleChoiceOption,
    Question,
    ReverseQuestion,
} from 'src/app/exam/exam.model';
import { QuestionPreviewDialogComponent } from 'src/app/question/preview/question-preview-dialog.component';
import { QuestionBasicInfoComponent } from 'src/app/question/question-basic-info.component';
import { QuestionUsageComponent } from 'src/app/question/question-usage.component';
import { QuestionService } from 'src/app/question/question.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { CKEditorComponent } from 'src/app/shared/ckeditor/ckeditor.component';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';
import { ClaimChoiceComponent } from './claim-choice.component';
import { EssayComponent } from './essay.component';
import { MultiChoiceComponent } from './multichoice.component';
import { WeightedMultiChoiceComponent } from './weighted-multichoice.component';

// This component depicts a distributed exam question. Only used thru a modal.
@Component({
    selector: 'xm-exam-question',
    templateUrl: './exam-question.component.html',
    styleUrls: ['../question.shared.scss'],
    standalone: true,
    imports: [
        FormsModule,
        NgbPopover,
        CKEditorComponent,
        NgClass,
        FixedPrecisionValidatorDirective,
        UpperCasePipe,
        TranslateModule,
        QuestionBasicInfoComponent,
        QuestionUsageComponent,
        EssayComponent,
        WeightedMultiChoiceComponent,
        MultiChoiceComponent,
        ClaimChoiceComponent,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class ExamQuestionComponent implements OnInit, OnDestroy {
    @Input() examQuestion!: ExamSectionQuestion;
    @Input() lotteryOn = false;
    @Output() saved = new EventEmitter<{ question: Question; examQuestion: ExamSectionQuestion }>();
    @Output() cancelled = new EventEmitter<{ dirty: boolean }>();
    @ViewChild('questionForm', { static: false }) questionForm?: NgForm;

    question?: ReverseQuestion;
    examNames: string[] = [];
    sectionNames: string[] = [];
    missingOptions: string[] = [];
    isInPublishedExam = false;
    hideRestExams = true;

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
        private Question: QuestionService,
        private Attachment: AttachmentService,
        private modal: NgbModal,
    ) {}

    ngOnInit() {
        this.init();
    }

    ngOnDestroy() {
        window.removeEventListener('beforeunload', this.onUnload);
    }

    save = () =>
        this.saved.emit({
            question: this.question as ReverseQuestion,
            examQuestion: this.examQuestion as ExamSectionQuestion,
        });

    setText = ($event: string) => {
        if (this.question) this.question.question = $event;
    };

    cancel = () => this.cancelled.emit({ dirty: this.questionForm?.dirty || false });

    openPreview = () => {
        const modal = this.modal.open(QuestionPreviewDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modal.componentInstance.question = this.examQuestion;
        modal.componentInstance.isExamQuestion = true;
    };

    showWarning = () => this.examNames && this.examNames.length > 1;
    estimateCharacters = () => (this.examQuestion.expectedWordCount || 0) * 8;

    removeOption = (selectedOption: ExamSectionQuestionOption) => {
        if (this.lotteryOn) {
            this.toast.error(this.translate.instant('i18n_action_disabled_lottery_on'));
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
            this.toast.error(this.translate.instant('i18n_action_disabled_minimum_options'));
        }
    };

    addNewOption = () => {
        if (this.lotteryOn) {
            this.toast.error(this.translate.instant('i18n_action_disabled_lottery_on'));
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
        this.examQuestion.options.push(newOption);
    };

    correctAnswerToggled = (option: ExamSectionQuestionOption) =>
        this.Question.toggleCorrectOption(
            option.option,
            this.examQuestion.options.map((o) => o.option) as MultipleChoiceOption[],
        );

    optionDisabled = (option: ExamSectionQuestionOption) => option.option.correctOption;
    optionsChanged = ($event: ExamSectionQuestionOption[]) => (this.examQuestion.options = [...$event]);

    updateEvaluationType = ($event: string) => {
        this.examQuestion.evaluationType = $event;
        if ($event === 'Selection') {
            this.examQuestion.maxScore = 0;
        }
    };
    updateWordCount = ($event: number) => (this.examQuestion.expectedWordCount = $event);
    updateEvaluationCriteria = ($event: string) => (this.examQuestion.evaluationCriteria = $event);

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

    returnOptionClass = (option: ExamSectionQuestionOption) => {
        const optionType = this.determineOptionType(option);
        if (!optionType) {
            return '';
        }
        return this.Question.determineClaimChoiceOptionClass(optionType);
    };

    determineOptionType = (option: ExamSectionQuestionOption) =>
        this.Question.determineClaimOptionTypeForExamQuestionOption(option);

    returnOptionDescriptionTranslation = (option: ExamSectionQuestionOption) => {
        const optionType = this.determineOptionType(option);
        if (!optionType) {
            return;
        }
        return this.Question.determineOptionDescriptionTranslation(optionType);
    };

    validate = () => {
        this.missingOptions = this.Question.getInvalidDistributedClaimOptionTypes(
            this.examQuestion.options as ExamSectionQuestionOption[],
        )
            .filter((type) => type !== 'SkipOption')
            .map((optionType) => this.Question.getOptionTypeTranslation(optionType));
    };

    hasInvalidClaimChoiceOptions = () =>
        this.examQuestion.question.type === 'ClaimChoiceQuestion' &&
        this.Question.getInvalidDistributedClaimOptionTypes(this.examQuestion.options as ExamSectionQuestionOption[])
            .length > 0;

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
            this.examNames = examNames.filter((n, pos) => examNames.indexOf(n) === pos).sort();
            this.sectionNames = sectionNames.filter((n, pos) => sectionNames.indexOf(n) === pos);
            this.validate();
            window.addEventListener('beforeunload', this.onUnload);
        });

    private onUnload = (event: BeforeUnloadEvent) => {
        if (this.questionForm?.dirty) event.preventDefault();
    };
}
