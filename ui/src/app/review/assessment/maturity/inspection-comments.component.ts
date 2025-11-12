// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div class="row mb-3 mt-2 align-items-center">
            <div class="col-md-2 ">{{ 'i18n_inspector_comments' | translate }}:</div>
            <div class="col-md-10">
                @if (addingVisible()) {
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

        @for (comment of allComments(); track comment) {
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
    exam = input.required<Exam>();
    addingVisible = input(false);

    // Output signal to notify parent when a comment is added
    commentAdded = output<InspectionComment>();

    // Computed signal that combines exam comments with locally added ones
    allComments = computed(() => {
        const examComments = this.exam().inspectionComments || [];
        const local = this.localComments();
        // Combine: local comments first (newest), then exam comments
        return [...local, ...examComments];
    });

    // Local signal to track newly added comments (before parent refreshes)
    private localComments = signal<InspectionComment[]>([]);

    private modal = inject(ModalService);
    private http = inject(HttpClient);

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
                // Update local signal (automatically triggers change detection)
                this.localComments.update((comments) => [comment, ...comments]);
                // Emit output signal to notify parent
                this.commentAdded.emit(comment);
            });
}
