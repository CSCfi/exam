// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbModal, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionPreviewDialogComponent } from 'src/app/question/preview/question-preview-dialog.component';
import { QuestionBasicInfoComponent } from 'src/app/question/question-basic-info.component';
import { QuestionUsageComponent } from 'src/app/question/question-usage.component';
import type {
    ExamSectionQuestion,
    ExamSectionQuestionOption,
    Question,
    ReverseQuestion,
} from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
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
    imports: [
        FormsModule,
        NgbPopover,
        FixedPrecisionValidatorDirective,
        TranslateModule,
        QuestionBasicInfoComponent,
        QuestionUsageComponent,
        EssayComponent,
        WeightedMultiChoiceComponent,
        MultiChoiceComponent,
        ClaimChoiceComponent,
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

    private http = inject(HttpClient);
    private Question = inject(QuestionService);
    private Attachment = inject(AttachmentService);
    private modal = inject(NgbModal);

    ngOnInit() {
        this.init();
    }

    ngOnDestroy() {
        window.removeEventListener('beforeunload', this.onUnload);
    }

    save = () => {
        // Clean up temporary negative IDs before sending to server
        const cleanedExamQuestion = {
            ...this.examQuestion,
            options: this.examQuestion.options.map((opt) => ({
                ...opt,
                id: opt.id && opt.id < 0 ? undefined : opt.id,
            })),
        };

        this.saved.emit({
            question: this.question as ReverseQuestion,
            examQuestion: cleanedExamQuestion as ExamSectionQuestion,
        });
    };

    optionsChanged = ($event: ExamSectionQuestionOption[]) => (this.examQuestion.options = [...$event]);

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

    negativeScoreSettingChanged = ($event: boolean) => (this.examQuestion.negativeScoreAllowed = $event);

    shufflingSettingChanged = ($event: boolean) => (this.examQuestion.optionShufflingOn = $event);

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

    hasInvalidClaimChoiceOptions = () =>
        this.examQuestion.question.type === 'ClaimChoiceQuestion' &&
        this.Question.getInvalidDistributedClaimOptionTypes(this.examQuestion.options).length > 0;

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
            window.addEventListener('beforeunload', this.onUnload);
        });

    private onUnload = (event: BeforeUnloadEvent) => {
        if (this.questionForm?.dirty) event.preventDefault();
    };
}
