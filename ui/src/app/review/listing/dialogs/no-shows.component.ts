// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
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
})
export class NoShowsComponent implements OnInit {
    @Input() noShows: (ExamEnrolment & { displayName: string })[] = [];

    noShowPredicate = 'reservation.startAt';
    reverse = false;

    private modal = inject(NgbActiveModal);

    //TODO: This could be combined with the aborted exams component by adding some more bindings for customization.
    ngOnInit() {
        this.noShows.forEach((r) => {
            const id = (r.exam ? r.exam.id : r.collaborativeExam.id).toString();
            r.displayName = r.user ? `${r.user.lastName} ${r.user.firstName}` : id;
        });
    }

    cancel = () => this.modal.dismiss();

    setPredicate = (predicate: string) => {
        if (this.noShowPredicate === predicate) {
            this.reverse = !this.reverse;
        }
        this.noShowPredicate = predicate;
    };
}
