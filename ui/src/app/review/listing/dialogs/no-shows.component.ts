// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';

@Component({
    selector: 'xm-no-shows-component',
    imports: [TranslateModule, ApplyDstPipe, OrderByPipe, DatePipe, TableSortComponent],
    templateUrl: './no-shows.component.html',
    styleUrls: ['../review-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoShowsComponent {
    noShowPredicate = signal('reservation.startAt');
    reverse = signal(false);

    private _noShows = signal<(ExamEnrolment & { displayName: string })[]>([]);
    private modal = inject(NgbActiveModal);

    get noShows() {
        return this._noShows();
    }

    @Input()
    set noShows(value: (ExamEnrolment & { displayName: string })[]) {
        this._noShows.set(value);
        //TODO: This could be combined with the aborted exams component by adding some more bindings for customization.
        value.forEach((r) => {
            const id = (r.exam ? r.exam.id : r.collaborativeExam.id).toString();
            r.displayName = r.user ? `${r.user.lastName} ${r.user.firstName}` : id;
        });
    }

    cancel() {
        this.modal.dismiss();
    }

    setPredicate(predicate: string) {
        if (this.noShowPredicate() === predicate) {
            this.reverse.update((v) => !v);
        }
        this.noShowPredicate.set(predicate);
    }
}
