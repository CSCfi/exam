// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { ControlContainer, FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, map } from 'rxjs/operators';
import { QuestionBasicInfoComponent } from 'src/app/question/question-basic-info.component';
import { QuestionUsageComponent } from 'src/app/question/question-usage.component';
import type { QuestionDraft } from 'src/app/question/question.model';
import { ExamSectionQuestion, Question, ReverseQuestion, Tag } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import type { QuestionAdditionalInfoConfig } from 'src/app/question/shared/question-additional-info.component';
import { QuestionAdditionalInfoComponent } from 'src/app/question/shared/question-additional-info.component';
import { TagPickerComponent } from 'src/app/question/tags/tag-picker.component';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ClaimChoiceEditorComponent } from './claim-choice.component';
import { EssayEditorComponent } from './essay.component';
import { MultipleChoiceEditorComponent } from './multiple-choice.component';

@Component({
    selector: 'xm-question-body',
    templateUrl: './question-body.component.html',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [
        ReactiveFormsModule,
        NgClass,
        EssayEditorComponent,
        MultipleChoiceEditorComponent,
        ClaimChoiceEditorComponent,
        QuestionBasicInfoComponent,
        QuestionUsageComponent,
        QuestionAdditionalInfoComponent,
        NgbTypeahead,
        TagPickerComponent,
        TranslateModule,
    ],
    styleUrls: ['../question.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionBodyComponent {
    question = input.required<ReverseQuestion | QuestionDraft>();
    currentOwners = input<User[]>([]);
    lotteryOn = input(false);
    examId = input(0);
    sectionQuestion = input<ExamSectionQuestion>();
    collaborative = input(false);

    currentOwnersChange = output<User[]>();
    questionChange = output<ReverseQuestion | QuestionDraft>();

    isInPublishedExam = signal(false);
    examNames = signal<string[]>([]);
    sectionNames = signal<string[]>([]);
    newOwner = signal<{ name?: string }>({});
    newOwnerTemplate = signal<User | undefined>(undefined);
    newType = signal('');
    questionTypes = signal<{ type: string; name: string }[]>([
        { type: 'essay', name: 'i18n_toolbar_essay_question' },
        { type: 'cloze', name: 'i18n_toolbar_cloze_test_question' },
        { type: 'multichoice', name: 'i18n_toolbar_multiplechoice_question' },
        { type: 'weighted', name: 'i18n_toolbar_weighted_multiplechoice_question' },
        { type: 'claim', name: 'i18n_toolbar_claim_choice_question' },
    ]);
    hideRestExams = signal(true);

    additionalInfoConfig = computed<QuestionAdditionalInfoConfig>(() => {
        const q = this.question();
        return {
            showWarning: this.showWarning(),
            onSelectFile: () => this.selectFile(),
            onDownloadAttachment: () => this.downloadQuestionAttachment(),
            onRemoveAttachment: () => this.removeQuestionAttachment(),
            getFileSize: () => this.getFileSize(),
            hasUploadedAttachment: () => this.hasUploadedAttachment(),
            question: q,
            instructionsValue: q.defaultAnswerInstructions || '',
            instructionsId: 'defaultInstructions',
            instructionsName: 'defaultInstructions',
            onInstructionsChange: (value: string) => this.setDefaultAnswerInstructions(value),
            evaluationCriteriaValue: q.defaultEvaluationCriteria,
            onEvaluationCriteriaChange: (value: string) => this.setDefaultEvaluationCriteria(value),
            showEvaluationCriteria: q.type === 'EssayQuestion',
            owners: this.currentOwners(),
            ownersReadOnly: false, // Always use content projection to handle both editable and read-only cases
            showOwners: true,
            tags: q.tags.filter((tag) => tag.id !== undefined).map((tag) => ({ id: tag.id!, name: tag.name })),
            tagsReadOnly: false,
            showTags: !this.collaborative(),
            sectionNames: this.sectionNames(),
            showSections: this.sectionNames().length > 0,
            sectionsDisplayFormat: 'comma',
        };
    });

    questionBodyForm: FormGroup;

    private http = inject(HttpClient);
    private Session = inject(SessionService);
    private Attachment = inject(AttachmentService);
    private Question = inject(QuestionService);
    private parentForm = inject(FormGroupDirective);
    private formInitialized = signal(false);

    constructor() {
        // Initialize nested form group for question body
        this.questionBodyForm = new FormGroup({
            defaultMaxScore: new FormControl(null),
            newOwnerName: new FormControl(''),
        });

        // Add to parent form
        this.parentForm.form.addControl('questionBody', this.questionBodyForm);

        // Initialize exam names and section names when question changes
        effect(() => {
            const questionValue = this.question();
            this.init(questionValue);
            // Only initialize form once - don't sync after that
            // Form is the source of truth while editing
            if (questionValue && !this.formInitialized()) {
                this.questionBodyForm.reset(
                    {
                        defaultMaxScore: questionValue.defaultMaxScore || null,
                        newOwnerName: '', // Always keep owner name field empty
                    },
                    { emitEvent: false },
                );
                this.formInitialized.set(true);
            }
        });

        // Update disabled state when lotteryOn changes
        effect(() => {
            const defaultMaxScoreControl = this.questionBodyForm.get('defaultMaxScore');
            if (defaultMaxScoreControl) {
                if (this.lotteryOn()) {
                    defaultMaxScoreControl.disable({ emitEvent: false });
                } else {
                    defaultMaxScoreControl.enable({ emitEvent: false });
                }
            }
        });
    }

    onQuestionChange(updatedQuestion: Question | QuestionDraft) {
        // Cast to ReverseQuestion | QuestionDraft since we're updating a question that already has examSectionQuestions
        this.questionChange.emit(updatedQuestion as ReverseQuestion | QuestionDraft);
    }

    onTagAdded(tag: Tag) {
        const questionValue = this.question();
        const updatedQuestion = {
            ...questionValue,
            tags: [...questionValue.tags, tag],
        };
        this.questionChange.emit(updatedQuestion as ReverseQuestion | QuestionDraft);
    }

    onTagRemoved(tag: Tag) {
        const questionValue = this.question();
        const updatedQuestion = {
            ...questionValue,
            tags: questionValue.tags.filter((t) => t !== tag),
        };
        this.questionChange.emit(updatedQuestion as ReverseQuestion | QuestionDraft);
    }

    setQuestionType($event: string) {
        const questionValue = this.question();
        questionValue.type = this.Question.getQuestionType($event);
        this.init(questionValue);
    }

    setText($event: string) {
        const questionValue = this.question();
        questionValue.question = $event;
    }

    setDefaultAnswerInstructions(value: string) {
        const questionValue = this.question();
        questionValue.defaultAnswerInstructions = value;
    }

    setDefaultEvaluationCriteria(value: string) {
        const questionValue = this.question();
        questionValue.defaultEvaluationCriteria = value;
    }

    setNewOwnerName(value: string) {
        this.newOwner.set({ name: value });
        // Sync to form control
        this.questionBodyForm.patchValue({ newOwnerName: value }, { emitEvent: false });
    }

    showWarning() {
        return this.examNames().length > 1;
    }

    sortByString(prop: string[]): string[] {
        return prop.sort();
    }

    listQuestionOwners$ = (filter$: Observable<string>): Observable<User[]> => {
        const currentOwnersValue = this.currentOwners() ?? [];
        return filter$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            exhaustMap((term) =>
                term.length < 2
                    ? from([])
                    : this.http.get<User[]>('/app/users/question/owners/TEACHER', { params: { q: term } }),
            ),
            map((users) => users.filter((u) => currentOwnersValue.map((o) => o.id).indexOf(u.id) === -1).slice(0, 15)),
        );
    };

    nameFormat = (u: User | string | null | undefined): string => {
        // If it's a string (like empty string or typed text), return it as-is
        if (typeof u === 'string') {
            return u;
        }
        // If it's null or undefined, return empty string
        if (!u || typeof u !== 'object') {
            return '';
        }
        // If it's a User object, format it
        return `${u.firstName} ${u.lastName} <${u.email}>`;
    };

    setQuestionOwner(event: NgbTypeaheadSelectItemEvent) {
        // Using template to store the selected user
        this.newOwnerTemplate.set(event.item);
    }

    addQuestionOwner() {
        const template = this.newOwnerTemplate();
        if (template && template.id) {
            const currentOwnersValue = this.currentOwners() ?? [];
            const updatedOwners = [...currentOwnersValue, template];
            this.currentOwnersChange.emit(updatedOwners);

            // Clear form control and template
            this.questionBodyForm.patchValue({ newOwnerName: '' }, { emitEvent: false });
            this.newOwner.set({});
            this.newOwnerTemplate.set(undefined);
        }
    }

    removeOwnerDisabled(user: User) {
        const currentOwnersValue = this.currentOwners() ?? [];
        const questionValue = this.question();
        return (
            currentOwnersValue.length === 1 || (questionValue.state === 'NEW' && this.Session.getUser().id === user.id)
        );
    }

    removeOwner(user: User) {
        if (this.removeOwnerDisabled(user)) {
            return;
        }
        const currentOwnersValue = this.currentOwners() ?? [];
        const updatedOwners = currentOwnersValue.filter((o) => o !== user);
        this.currentOwnersChange.emit(updatedOwners);
    }

    selectFile() {
        this.Attachment.selectFile$(true).subscribe((data) => {
            const questionValue = this.question();
            questionValue.attachment = {
                ...questionValue.attachment,
                modified: true,
                fileName: data.$value.attachmentFile.name,
                size: data.$value.attachmentFile.size,
                file: data.$value.attachmentFile,
                removed: false,
            };
        });
    }

    downloadQuestionAttachment() {
        const questionValue = this.question();
        const sectionQuestionValue = this.sectionQuestion();
        if (questionValue.attachment && questionValue.attachment.externalId && sectionQuestionValue) {
            this.Attachment.downloadCollaborativeQuestionAttachment(this.examId(), sectionQuestionValue);
            return;
        }
        this.Attachment.downloadQuestionAttachment(questionValue);
    }

    removeQuestionAttachment() {
        const questionValue = this.question();
        if (questionValue.attachment) {
            this.Attachment.removeQuestionAttachment(questionValue);
        }
    }

    getFileSize() {
        const questionValue = this.question();
        if (questionValue.attachment) {
            return `(${this.Attachment.getFileSize(questionValue.attachment.size)})`;
        }
        return '';
    }

    hasUploadedAttachment() {
        const questionValue = this.question();
        const a = questionValue.attachment;
        return !!(a && (a.id || a.externalId));
    }

    removeTag(tag: Tag) {
        const questionValue = this.question();
        const updatedQuestion = {
            ...questionValue,
            tags: questionValue.tags.filter((t) => t !== tag),
        };
        this.questionChange.emit(updatedQuestion);
    }

    isUserAllowedToModifyOwners() {
        const questionValue = this.question();
        const user = this.Session.getUser();
        return (
            questionValue.questionOwners &&
            (user.isAdmin || questionValue.questionOwners.map((o) => o.id).indexOf(user.id) > -1)
        );
    }

    private init(questionValue: ReverseQuestion | QuestionDraft) {
        const examSectionQuestions = questionValue.examSectionQuestions;
        if (!examSectionQuestions) {
            this.examNames.set([]);
            this.sectionNames.set([]);
            return;
        }
        const sections = examSectionQuestions.map((esq) => esq.examSection);
        const examNames = sections.map((s) => {
            if (s.exam.state === 'PUBLISHED') {
                this.isInPublishedExam.set(true);
            }
            return s.exam.name as string;
        });
        const sectionNames = sections.map((s) => s.name);
        // remove duplicates
        this.examNames.set(examNames.filter((n, pos) => examNames.indexOf(n) === pos).sort());
        this.sectionNames.set(sectionNames.filter((n, pos) => sectionNames.indexOf(n) === pos));
    }
}
