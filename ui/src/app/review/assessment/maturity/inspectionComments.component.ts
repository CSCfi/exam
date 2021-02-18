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

import { Exam } from '../../../exam/exam.model';
import type { User } from '../../../session/session.service';
import { InspectionCommentDialogComponent } from './dialogs/inspectionCommentDialog.component';

@Component({
    selector: 'r-inspection-comments',
    templateUrl: './inspectionComments.component.html',
})
export class InspectionCommentsComponent {
    @Input() exam: Exam;
    @Input() addingDisabled: boolean;
    @Input() addingVisible: boolean;

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
