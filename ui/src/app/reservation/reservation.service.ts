// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { addMinutes, parseISO } from 'date-fns';
import { debounceTime, distinctUntilChanged, exhaustMap, forkJoin, from, map, noop, Observable, of } from 'rxjs';
import { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import type { CollaborativeExam, Exam } from 'src/app/exam/exam.model';
import { User } from 'src/app/session/session.model';
import { ChangeMachineDialogComponent } from './admin/change-machine-dialog.component';
import { RemoveReservationDialogComponent } from './admin/remove-reservation-dialog.component';
import {
    isCollaborative,
    isLocalTransfer,
    isRemoteTransfer,
    RemoteTransferExamReservation,
    type AnyReservation,
    type ExamMachine,
    type LocalTransferExamEnrolment,
    type LocalTransferExamReservation,
    type Reservation,
} from './reservation.model';

export interface Selection {
    [data: string]: string;
}
@Injectable({ providedIn: 'root' })
export class ReservationService {
    private http = inject(HttpClient);
    private modal = inject(NgbModal);

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
        from(modalRef.result).subscribe({
            next: (machine: ExamMachine) => {
                if (machine) {
                    reservation.machine = machine;
                }
            },
            error: noop,
        });
    };

    cancelReservation = (reservation: Reservation): Promise<void> => {
        const modalRef = this.modal.open(RemoveReservationDialogComponent, {
            backdrop: 'static',
            keyboard: false,
        });
        modalRef.componentInstance.reservation = reservation;
        return modalRef.result;
    };

    listReservations$ = (params: Selection) => {
        // Do not fetch byod exams if machine id, room id or external ref in the query params.
        // Also applies if searching for external reservations
        const eventRequest =
            params.roomId || params.machineId || params.externalRef || params.state?.startsWith('EXTERNAL_')
                ? of([])
                : this.http.get<ExamEnrolment[]>('/app/events', { params: params });
        return forkJoin([this.http.get<Reservation[]>('/app/reservations', { params: params }), eventRequest]).pipe(
            map(([reservations, enrolments]) => {
                const events: Partial<Reservation>[] = enrolments.map((ee) => {
                    // This is hacky. We use examination events as reservations when they are a completely different concept.
                    return {
                        id: -ee.id, // Use negative enrolment ID to avoid clashing with reservation IDs
                        user: ee.user,
                        enrolment: ee,
                        startAt: ee.examinationEventConfiguration?.examinationEvent.start,
                        endAt: addMinutes(
                            parseISO(ee.examinationEventConfiguration?.examinationEvent.start as string),
                            ee.exam.duration,
                        ).toISOString(),
                    };
                });
                const allEvents: Partial<Reservation>[] = reservations;
                return allEvents.concat(events) as Reservation[]; // FIXME: this is wrong(?) <- don't know how to model anymore with strict checking
            }),
            map((reservations: Reservation[]) =>
                reservations.map((r) => ({
                    ...r,
                    userAggregate: r.user
                        ? `${r.user.lastName}  ${r.user.firstName}`
                        : r.externalUserRef
                          ? r.externalUserRef
                          : r.enrolment?.exam
                            ? r.enrolment.exam.id.toString()
                            : '',
                    org: '',
                    stateOrd: 0,
                    enrolment: r.enrolment ? { ...r.enrolment, teacherAggregate: '' } : r.enrolment,
                })),
            ),
            map((reservations: AnyReservation[]) => {
                // Transfer exams taken here
                reservations.filter(isLocalTransfer).forEach((r: LocalTransferExamReservation) => {
                    const state = r.enrolment?.externalExam?.finished ? 'EXTERNAL_FINISHED' : 'EXTERNAL_UNFINISHED';
                    const enrolment: LocalTransferExamEnrolment = {
                        ...r.enrolment,
                        exam: {
                            id: r.enrolment?.externalExam?.id as number,
                            external: true,
                            examOwners: [],
                            state: state,
                            parent: null,
                        },
                    };
                    r.enrolment = enrolment;
                });
                // Transfer exams taken elsewhere
                reservations.filter(isRemoteTransfer).forEach((r: RemoteTransferExamReservation) => {
                    if (r.externalReservation) {
                        r.org = { name: r.externalReservation.orgName, code: r.externalReservation.orgCode };
                        r.machine = {
                            name: r.externalReservation.machineName,
                            room: { name: r.externalReservation.roomName },
                        };
                    }
                });
                // Collaborative exams
                reservations.filter(isCollaborative).forEach((r) => {
                    if (!r.enrolment.exam) {
                        r.enrolment.exam = {
                            ...r.enrolment.collaborativeExam,
                            examOwners: [],
                            parent: null,
                            implementation: 'AQUARIUM',
                        };
                    } else {
                        r.enrolment.exam.examOwners = [];
                    }
                });

                return reservations;
            }),
            map((reservations: AnyReservation[]) => reservations.filter((r) => r.enrolment?.exam)),
            map((reservations: AnyReservation[]) => {
                reservations.forEach((r) => {
                    const exam = (r.enrolment?.exam.parent || r.enrolment?.exam) as Exam;
                    r.enrolment = {
                        ...(r.enrolment as ExamEnrolment),
                        teacherAggregate: exam.examOwners.map((o) => o.lastName + o.firstName).join(),
                    };
                    const state = this.printExamState(r) as string;
                    r.stateOrd = [
                        'PUBLISHED',
                        'NO_SHOW',
                        'STUDENT_STARTED',
                        'ABORTED',
                        'REVIEW',
                        'REVIEW_STARTED',
                        'GRADED',
                        'GRADED_LOGGED',
                        'REJECTED',
                        'ARCHIVED',
                        'EXTERNAL_UNFINISHED',
                        'EXTERNAL_FINISHED',
                    ].indexOf(state);
                });
                return reservations;
            }),
        );
    };

    searchStudents$ = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            exhaustMap((term) =>
                term.length < 2
                    ? from([])
                    : this.http.get<(User & { name: string })[]>('/app/reservations/students', {
                          params: { filter: term },
                      }),
            ),
            map((ss) => ss.sort((a, b) => a.firstName.localeCompare(b.firstName)).slice(0, 100)),
        );

    searchOwners$ = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            exhaustMap((term) =>
                term.length < 2
                    ? from([])
                    : this.http.get<(User & { name: string })[]>('/app/reservations/teachers', {
                          params: { filter: term },
                      }),
            ),
            map((ss) => ss.sort((a, b) => a.lastName.localeCompare(b.lastName)).slice(0, 100)),
        );

    searchExams$ = (text$: Observable<string>, includeCollaboratives = false) => {
        const listExams$ = (text: string) => {
            const examObservables: Observable<Exam[] | CollaborativeExam[]>[] = [
                this.http.get<Exam[]>('/app/reservations/exams', { params: { filter: text } }),
            ];
            if (includeCollaboratives) {
                examObservables.push(
                    this.http.get<CollaborativeExam[]>('/app/iop/exams', { params: { filter: text } }),
                );
            }
            return forkJoin(examObservables).pipe(map((exams) => exams.flat()));
        };
        return text$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            exhaustMap((term) => (term.length < 2 ? from([]) : listExams$(term))),
            map((es) => es.sort((a, b) => (a.name as string).localeCompare(b.name as string)).slice(0, 100)),
        );
    };
}
