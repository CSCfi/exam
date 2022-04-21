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
import { Component, Input } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import type { Exam } from '../../../exam/exam.model';
import type { User } from '../../../session/session.service';
import { InspectionCommentDialogComponent } from './dialogs/inspection-comment-dialog.component';

@Component({
    selector: 'xm-r-inspection-comments',
    template: `<div class="detail-row marb20 mart20">
            <div class="col-md-12 general-info-title">{{ 'sitnet_inspector_comments' | translate }}:</div>
        </div>

        <div *ngFor="let comment of exam.inspectionComments" class="col-md-12 padl0 marb20">
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

        <div class="main-row">
            <span class="col-md-12">
                <div class="review-attachment-button exam-questions-buttons mr-2">
                    <button class="btn btn-link" *ngIf="addingVisible" (click)="addInspectionComment()">
                        {{ 'sitnet_inspection_comment_title' | translate }}
                    </button>
                </div>
                <sup>
                    <img
                        ngbPopover="{{ 'sitnet_inspection_comment_info' | translate }}"
                        popoverTitle="{{ 'sitnet_instructions' | translate }}"
                        triggers="mouseenter:mouseleave"
                        src="/assets/images/icon_tooltip.svg"
                        alt="{{ 'sitnet_inspection_comment_info' | translate }}"
                        onerror="this.onerror=null;this.src='/assets/images/icon_tooltip.png';"
                    />
                </sup>
            </span>
        </div> `,
})
export class InspectionCommentsComponent {
    @Input() exam!: Exam;
    @Input() addingVisible = false;

    constructor(private modal: NgbModal, private http: HttpClient) {}

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
