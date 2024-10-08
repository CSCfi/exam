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
import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, map } from 'rxjs/operators';
import type { ExamSectionQuestion, ReverseQuestion, Tag } from 'src/app/exam/exam.model';
import type { QuestionDraft } from 'src/app/question/question.service';
import { QuestionService } from 'src/app/question/question.service';
import { TagPickerComponent } from 'src/app/question/tags/tag-picker.component';
import type { User } from 'src/app/session/session.service';
import { SessionService } from 'src/app/session/session.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { CKEditorComponent } from 'src/app/shared/ckeditor/ckeditor.component';
import { ClaimChoiceEditorComponent } from './claim-choice.component';
import { EssayEditorComponent } from './essay.component';
import { MultipleChoiceEditorComponent } from './multiple-choice.component';

@Component({
    selector: 'xm-question-body',
    templateUrl: './question-body.component.html',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    standalone: true,
    imports: [
        FormsModule,
        NgbPopover,
        NgClass,
        CKEditorComponent,
        EssayEditorComponent,
        MultipleChoiceEditorComponent,
        ClaimChoiceEditorComponent,
        NgbTypeahead,
        TagPickerComponent,
        TranslateModule,
    ],
    styleUrls: ['../question.shared.scss'],
    styles: '.initial-width { width: initial !important; }',
})
export class QuestionBodyComponent implements OnInit {
    @Input() question!: ReverseQuestion | QuestionDraft;
    @Input() currentOwners: User[] = [];
    @Input() lotteryOn = false;
    @Input() examId = 0;
    @Input() sectionQuestion?: ExamSectionQuestion;
    @Input() collaborative = false;

    isInPublishedExam = false;
    examNames: string[] = [];
    sectionNames: string[] = [];
    newOwner: { name?: string } = {};
    newOwnerTemplate?: User;
    newType = '';
    questionTypes: { type: string; name: string }[] = [];
    hideRestExams = true;

    constructor(
        private http: HttpClient,
        private cdr: ChangeDetectorRef,
        private Session: SessionService,
        private Attachment: AttachmentService,
        private Question: QuestionService,
    ) {}

    ngOnInit() {
        this.questionTypes = [
            { type: 'essay', name: 'i18n_toolbar_essay_question' },
            { type: 'cloze', name: 'i18n_toolbar_cloze_test_question' },
            { type: 'multichoice', name: 'i18n_toolbar_multiplechoice_question' },
            { type: 'weighted', name: 'i18n_toolbar_weighted_multiplechoice_question' },
            { type: 'claim', name: 'i18n_toolbar_claim_choice_question' },
        ];

        this.init();
    }

    setQuestionType = () => {
        this.question.type = this.Question.getQuestionType(this.newType);
        this.init();
        this.cdr.detectChanges();
    };

    showWarning = () => this.examNames.length > 1;

    sortByString = (prop: string[]): string[] => prop.sort();

    listQuestionOwners$ = (filter$: Observable<string>): Observable<User[]> =>
        filter$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            exhaustMap((term) =>
                term.length < 2
                    ? from([])
                    : this.http.get<User[]>('/app/users/question/owners/TEACHER', { params: { q: term } }),
            ),
            map((users) => users.filter((u) => this.currentOwners.map((o) => o.id).indexOf(u.id) === -1).slice(0, 15)),
        );

    nameFormat = (u: User & { name: string }) => {
        return u.name;
    };

    setQuestionOwner = (event: NgbTypeaheadSelectItemEvent) =>
        // Using template to store the selected user
        (this.newOwnerTemplate = event.item);

    addQuestionOwner = () => {
        if (this.newOwnerTemplate && this.newOwnerTemplate.id) {
            this.currentOwners.push(this.newOwnerTemplate);

            // nullify input field and template
            delete this.newOwner.name;
            delete this.newOwnerTemplate;
        }
    };

    removeOwnerDisabled = (user: User) =>
        this.currentOwners.length === 1 || (this.question.state === 'NEW' && this.Session.getUser().id === user.id);

    removeOwner = (user: User) => {
        if (this.removeOwnerDisabled(user)) {
            return;
        }
        this.currentOwners.splice(this.currentOwners.indexOf(user), 1);
    };

    selectFile = () =>
        this.Attachment.selectFile(true).then((data) => {
            this.question.attachment = {
                ...this.question.attachment,
                modified: true,
                fileName: data.$value.attachmentFile.name,
                size: data.$value.attachmentFile.size,
                file: data.$value.attachmentFile,
                removed: false,
            };
        });

    downloadQuestionAttachment = () => {
        if (this.question.attachment && this.question.attachment.externalId && this.sectionQuestion) {
            this.Attachment.downloadCollaborativeQuestionAttachment(this.examId, this.sectionQuestion);
            return;
        }
        this.Attachment.downloadQuestionAttachment(this.question);
    };

    removeQuestionAttachment = () => {
        if (this.question.attachment) {
            this.Attachment.removeQuestionAttachment(this.question);
        }
    };

    getFileSize = () => {
        if (this.question.attachment) {
            return `(${this.Attachment.getFileSize(this.question.attachment.size)})`;
        }
        return '';
    };

    hasUploadedAttachment = () => {
        const a = this.question.attachment;
        return a && (a.id || a.externalId);
    };

    updateEvaluationType = () => {
        if (this.question.defaultEvaluationType === 'Selection') {
            delete this.question.defaultMaxScore;
        }
    };

    removeTag = (tag: Tag) => this.question.tags.splice(this.question.tags.indexOf(tag), 1);

    isUserAllowedToModifyOwners = () => {
        const user = this.Session.getUser();
        return (
            this.question.questionOwners &&
            (user.isAdmin || this.question.questionOwners.map((o) => o.id).indexOf(user.id) > -1)
        );
    };

    private init = () => {
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
    };
}
