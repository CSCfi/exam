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
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamEnrolment } from '../../../enrolment/enrolment.model';
import type { Exam } from '../../../exam/exam.model';
import { SessionService } from '../../../session/session.service';
import type { Review } from '../../review.model';

@Component({
    selector: 'aborted-exams',
    templateUrl: './aborted.component.html',
})
export class AbortedExamsComponent {
    @Input() exam!: Exam;
    @Input() abortedExams: Review[] = [];

    abortedPredicate = 'started';
    reverse = false;

    constructor(
        private modal: NgbActiveModal,
        private translate: TranslateService,
        private http: HttpClient,
        private toast: ToastrService,
        private Session: SessionService,
    ) {}

    showId = () => this.Session.getUser().isAdmin && this.exam.anonymous;

    permitRetrial = (enrolment: ExamEnrolment) => {
        this.http.put(`/app/enrolments/${enrolment.id}/retrial`, {}).subscribe(() => {
            enrolment.retrialPermitted = true;
            this.toast.info(this.translate.instant('sitnet_retrial_permitted'));
        });
    };

    cancel = () => this.modal.dismiss();

    setPredicate = (predicate: string) => {
        if (this.abortedPredicate === predicate) {
            this.reverse = !this.reverse;
        }
        this.abortedPredicate = predicate;
    };
}
