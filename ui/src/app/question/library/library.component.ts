/*
 * Copyright (c) 2020 Exam Consortium
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
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import { ToastrService } from 'ngx-toastr';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { FileService } from 'src/app/shared/file/file.service';
import type { Question } from '../../exam/exam.model';
import type { User } from '../../session/session.service';

@Component({
    selector: 'xm-library',
    template: `<div id="dashboard">
        <div class="top-row">
            <div class="col-md-12">
                <div class="student-enroll-title-wrap">
                    <div class="student-enroll-title marl20 marr-20">{{ 'sitnet_library_new' | translate }}</div>
                </div>
                <div class="teacher-toolbar">
                    <div class="make-inline">
                        <div class="review-attachment-button print-button">
                            <a (click)="import()" class="pointer">
                                {{ 'sitnet_toolbar_import_questions' | translate }}
                            </a>
                        </div>
                    </div>
                </div>
                <div class="teacher-toolbar">
                    <div class="make-inline">
                        <div class="review-attachment-button print-button">
                            <button
                                uiSref="staff.newQuestion"
                                [uiParams]="{ nextState: 'staff.library' }"
                                class="pointer"
                            >
                                {{ 'sitnet_toolbar_new_question' | translate }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="reservation-border">
            <xm-library-search (updated)="resultsUpdated($event)"></xm-library-search>
            <div *ngIf="selections.length > 0" class="padl30 padr30 questions-selections-box">
                <div class="make-inline">
                    <span class="padr10">{{ selections.length }} {{ 'sitnet_questions_selected' | translate }}</span>
                </div>

                <div class="row margin-20">
                    <div class="col-md-12 d-flex justify-content-between">
                        <xm-library-owner-selection
                            [selections]="selections"
                            (selected)="ownerSelected($event)"
                        ></xm-library-owner-selection>
                        <xm-library-transfer [selections]="selections"></xm-library-transfer>
                        <xm-library-file-export [selections]="selections"></xm-library-file-export>
                    </div>
                </div>
            </div>

            <div class="margin-20">
                <xm-library-results
                    [questions]="questions"
                    (copied)="questionCopied($event)"
                    (selected)="questionSelected($event)"
                >
                </xm-library-results>
            </div>
        </div>
    </div> `,
})
export class LibraryComponent {
    questions: Question[] = [];
    selections: number[] = [];

    constructor(
        private state: StateService,
        private translate: TranslateService,
        private toast: ToastrService,
        private Attachment: AttachmentService,
        private Files: FileService,
    ) {}

    resultsUpdated(results: Question[]) {
        this.questions = results;
    }

    questionSelected(selections: number[]) {
        this.selections = selections;
    }

    questionCopied(copy: Question) {
        this.toast.info(this.translate.instant('sitnet_question_copied'));
        this.state.go('staff.question', { id: copy.id });
    }

    ownerSelected(event: { user: User; selections: number[] }) {
        const questions = this.questions.filter((q) => event.selections.indexOf(q.id) > -1);
        questions.forEach((q) => q.questionOwners.push(event.user));
    }

    import() {
        this.Attachment.selectFile(false, {}, 'sitnet_import_questions_detail')
            .then((result) => {
                this.Files.upload('/app/questions/import', result.$value.attachmentFile, {}, undefined, () =>
                    this.state.reload(),
                );
                this.toast.success(`${this.translate.instant('sitnet_questions_imported_successfully')}`);
            })
            .catch((err) => this.toast.error(err));
    }
}
