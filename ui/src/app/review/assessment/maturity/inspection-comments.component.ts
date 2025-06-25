// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { NgbModal, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import type { Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
import { InspectionCommentDialogComponent } from './dialogs/inspection-comment-dialog.component';

@Component({
    selector: 'xm-r-inspection-comments',
    template: `<div class="row mb-3 mt-2 align-items-center">
            <div class="col-md-2 ">{{ 'i18n_inspector_comments' | translate }}:</div>
            <div class="col-md-10">
                @if (addingVisible) {
                    <button class="btn btn-success me-2" (click)="addInspectionComment()">
                        {{ 'i18n_inspection_comment_title' | translate }}
                    </button>
                }
                <sup
                    ngbPopover="{{ 'i18n_inspection_comment_info' | translate }}"
                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <img src="/assets/images/icon_tooltip.svg" alt="{{ 'i18n_inspection_comment_info' | translate }}" />
                </sup>
            </div>
        </div>

        @for (comment of exam.inspectionComments; track comment) {
            <div class="col-md-12 ps-0 mb-3">
                <div class="col-md-4">
                    {{ comment.creator.firstName }} {{ comment.creator.lastName }}
                    <small>({{ comment.creator.email }})</small>
                    <br />
                    {{ comment.created | date: 'dd.MM.yyyy HH:mm' }}
                </div>
                <div class="col-md-8">
                    {{ comment.comment }}
                </div>
            </div>
        } `,
    imports: [NgbPopover, DatePipe, TranslateModule],
})
export class InspectionCommentsComponent {
    @Input() exam!: Exam;
    @Input() addingVisible = false;

    constructor(
        private modal: NgbModal,
        private http: HttpClient,
    ) {}

    addInspectionComment = () =>
        from(
            this.modal.open(InspectionCommentDialogComponent, {
                backdrop: 'static',
                keyboard: true,
            }).result,
        )
            .pipe(
                switchMap((event: { comment: string }) =>
                    this.http.post<{ comment: string; creator: User; created: Date }>(
                        `/app/review/${this.exam.id}/inspection`,
                        {
                            comment: event.comment,
                        },
                    ),
                ),
            )
            .subscribe((comment) => this.exam.inspectionComments.unshift(comment));
}
