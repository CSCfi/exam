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
import { DatePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';

@Component({
    selector: 'xm-no-shows-component',
    standalone: true,
    imports: [TranslateModule, ApplyDstPipe, OrderByPipe, DatePipe, TableSortComponent],
    templateUrl: './no-shows.component.html',
    styleUrls: ['../review-list.component.scss'],
})
export class NoShowsComponent implements OnInit {
    @Input() noShows: (ExamEnrolment & { displayName: string })[] = [];

    noShowPredicate = 'reservation.startAt';
    reverse = false;

    constructor(private modal: NgbActiveModal) {}

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
