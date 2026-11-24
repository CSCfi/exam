// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { switchMap } from 'rxjs/operators';
import type { Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { InspectionCommentDialogComponent } from './dialogs/inspection-comment-dialog.component';

type InspectionComment = { comment: string; creator: User; created: Date };

@Component({
    selector: 'xm-r-inspection-comments',
    template: `<div class="info comments-heading">
            <div>{{ 'i18n_inspector_comments' | translate }}:</div>
            <div class="info-wide">
                @if (addingVisible()) {
                    <button class="btn btn-sm btn-outline-secondary me-2" (click)="addInspectionComment()">
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

        @for (comment of allComments(); track comment) {
            <div class="info-comment">
                <div>
                    <small>
                        {{ comment.creator.firstName }} {{ comment.creator.lastName }}
                        &middot;
                        {{ comment.created | date: 'dd.MM.yyyy HH:mm' }}
                    </small>
                    <br />
                    <small class="text-muted">{{ comment.creator.email }}</small>
                </div>
                <div>
                    {{ comment.comment }}
                </div>
            </div>
        } `,
    styleUrl: '../assessment.shared.scss',
    styles: `
        .comments-heading {
            align-items: center;
            margin-block: var(--xm-space-2) var(--xm-space-3);
        }
    `,
    imports: [NgbPopover, DatePipe, TranslateModule],
})
export class InspectionCommentsComponent {
    readonly exam = input.required<Exam>();
    readonly addingVisible = input(false);
    readonly commentAdded = output<InspectionComment>();

    readonly allComments = computed(() => [...this.localComments(), ...(this.exam().inspectionComments ?? [])]);
    private readonly localComments = signal<InspectionComment[]>([]);

    private readonly modal = inject(ModalService);
    private readonly http = inject(HttpClient);

    addInspectionComment = () =>
        this.modal
            .open$<{ comment: string }>(InspectionCommentDialogComponent)
            .pipe(
                switchMap((event) =>
                    this.http.post<InspectionComment>(`/app/review/${this.exam().id}/inspection`, {
                        comment: event.comment,
                    }),
                ),
            )
            .subscribe((comment) => {
                this.commentAdded.emit(comment);
                this.localComments.set([]);
            });
}
