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
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ExamEnrolment } from '../../../enrolment/enrolment.model';
import { SessionService } from '../../../session/session.service';

@Component({
    selector: 'xm-no-shows-component',
    templateUrl: './no-shows.component.html',
})
export class NoShowsComponent implements OnInit {
    @Input() noShows: (ExamEnrolment & { displayName: string })[] = [];

    noShowPredicate = 'reservation.startAt';
    reverse = false;

    constructor(private modal: NgbActiveModal, private Session: SessionService) {}

    //TODO: This could be combined with the aborted exams component by adding some more bindings for customization.
    ngOnInit() {
        this.noShows.forEach(
            (r) => (r.displayName = r.user ? `${r.user.lastName} ${r.user.firstName}` : r.exam.id.toString()),
        );
    }

    cancel = () => this.modal.dismiss();

    setPredicate = (predicate: string) => {
        if (this.noShowPredicate === predicate) {
            this.reverse = !this.reverse;
        }
        this.noShowPredicate = predicate;
    };
}
