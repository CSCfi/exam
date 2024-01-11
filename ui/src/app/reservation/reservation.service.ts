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
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { parseISO } from 'date-fns';
import { noop } from 'rxjs';
import type { Exam } from '../exam/exam.model';
import { ChangeMachineDialogComponent } from './admin/change-machine-dialog.component';
import { RemoveReservationDialogComponent } from './admin/remove-reservation-dialog.component';
import type { ExamMachine, Reservation } from './reservation.model';

@Injectable({ providedIn: 'root' })
export class ReservationService {
    constructor(private modal: NgbModal) {}

    printExamState = (reservation: {
        enrolment: { exam: { state: string }; collaborativeExam: { state: string }; noShow: boolean };
    }) =>
        reservation.enrolment.noShow
            ? 'NO_SHOW'
            : reservation.enrolment.exam
              ? reservation.enrolment.exam.state
              : reservation.enrolment.collaborativeExam.state;

    getReservationCount = (exam: Exam) =>
        exam.examEnrolments.filter(
            (enrolment) =>
                (enrolment.reservation && parseISO(enrolment.reservation.endAt) > new Date()) ||
                (enrolment.examinationEventConfiguration &&
                    new Date(enrolment.examinationEventConfiguration.examinationEvent.start) > new Date()),
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
            .catch(noop);
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
