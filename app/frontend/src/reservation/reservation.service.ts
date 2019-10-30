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
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { ExamEnrolment } from '../enrolment/enrolment.model';
import { Exam } from '../exam/exam.model';
import { ConfirmationDialogService } from '../utility/dialogs/confirmationDialog.service';
import { ChangeMachineDialogComponent } from './admin/changeMachineDialog.component';
import { RemoveReservationDialogComponent } from './admin/removeReservationDialog.component';
import { ExamMachine, Reservation } from './reservation.model';

@Injectable()
export class ReservationService {
    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private modal: NgbModal,
        private ConfirmationDialog: ConfirmationDialogService,
    ) {}

    printExamState = (reservation: {
        noShow: boolean;
        enrolment: { exam: { state: string }; collaborativeExam: { state: string } };
    }) =>
        reservation.noShow
            ? 'NO_SHOW'
            : reservation.enrolment.exam
            ? reservation.enrolment.exam.state
            : reservation.enrolment.collaborativeExam.state;

    removeReservation(enrolment: ExamEnrolment) {
        if (!enrolment.reservation) {
            return;
        }
        const externalRef = enrolment.reservation.externalRef;
        const dialog = this.ConfirmationDialog.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_are_you_sure'),
        );
        const successFn = () => {
            delete enrolment.reservation;
            enrolment.reservationCanceled = true;
        };
        const errorFn = (resp: { data: string }) => toast.error(resp.data);
        const url = externalRef
            ? `/integration/iop/reservations/external/${externalRef}`
            : `/app/calendar/reservation/${enrolment.reservation.id}`;

        dialog.result.then(() => this.http.delete(url).subscribe(successFn, errorFn));
    }

    getReservationCount = (exam: Exam) =>
        exam.examEnrolments.filter(
            enrolment => enrolment.reservation && enrolment.reservation.endAt > new Date().getTime(),
        ).length;

    changeMachine = (reservation: Reservation): void => {
        const modalRef = this.modal.open(ChangeMachineDialogComponent, {
            backdrop: 'static',
            keyboard: false,
        });
        modalRef.componentInstance.reservation = reservation;
        modalRef.result
            .then((machine: ExamMachine) => {
                if (machine) {
                    reservation.machine = machine;
                }
            })
            .catch(err => toast.error(err));
    };

    cancelReservation = (reservation: Reservation): Promise<void> => {
        const modalRef = this.modal.open(RemoveReservationDialogComponent, {
            backdrop: 'static',
            keyboard: false,
        });
        modalRef.componentInstance.reservation = reservation;
        return modalRef.result;
    };
}
