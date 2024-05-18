// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { parseISO } from 'date-fns';
import { noop } from 'rxjs';
import type { Exam } from 'src/app/exam/exam.model';
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
