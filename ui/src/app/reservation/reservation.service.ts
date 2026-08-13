// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { debounceTime, distinctUntilChanged, EMPTY, exhaustMap, forkJoin, map, Observable, of } from 'rxjs';
import { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import type { CollaborativeExam, Exam } from 'src/app/exam/exam.model';
import { User } from 'src/app/session/session.model';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { Option } from 'src/app/shared/select/select.model';
import { ChangeMachineDialogComponent } from './admin/change-machine-dialog.component';
import { RemoveReservationDialogComponent } from './admin/remove-reservation-dialog.component';
import {
    isCollaborative,
    isLocalTransfer,
    isRemoteTransfer,
    type AnyReservation,
    type ExamMachine,
    type ExamRoom,
    type LocalTransferExamEnrolment,
    type Reservation,
} from './reservation.model';

export interface Selection {
    [data: string]: string;
}

const STATE_ORDER = [
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
];

@Injectable({ providedIn: 'root' })
export class ReservationService {
    private readonly http = inject(HttpClient);
    private readonly modal = inject(ModalService);

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
                (enrolment.reservation && DateTime.fromISO(enrolment.reservation.endAt) > DateTime.now()) ||
                (enrolment.examinationEventConfiguration &&
                    new Date(enrolment.examinationEventConfiguration.examinationEvent.start) > new Date()),
        ).length;

    getInteropSetting$ = () => this.http.get<{ isExamVisitSupported: boolean }>('/app/settings/iop/examVisit');

    getExamRooms$ = () =>
        this.http
            .get<ExamRoom[]>('/app/reservations/examrooms')
            .pipe(map((rooms) => rooms.sort((a, b) => a.name.localeCompare(b.name))));

    getMachines$ = () =>
        this.http
            .get<ExamMachine[]>('/app/machines')
            .pipe(map((machines) => machines.sort((a, b) => a.name.localeCompare(b.name))));

    machinesForRoom = (room: ExamRoom, machines: ExamMachine[]): Option<ExamMachine, number>[] => {
        if (room.examMachines.length < 1) return [];
        const machineData: Option<ExamMachine, number>[] = machines
            .filter((m) => room.examMachines.some((rem) => m.id === rem.id))
            .map((m) => ({ id: m.id, value: m, label: m.name ?? '' }));
        return [{ id: undefined, label: room.name, isHeader: true }, ...machineData];
    };

    machinesForRooms = (rooms: ExamRoom[], machines: ExamMachine[]): Option<ExamMachine, number>[] =>
        rooms.flatMap((r) => this.machinesForRoom(r, machines));

    changeMachine$ = (reservation: Reservation): Observable<Reservation | undefined> => {
        const modalRef = this.modal.openRef(ChangeMachineDialogComponent);
        modalRef.componentInstance.reservation.set(reservation);
        return this.modal.result$<Reservation>(modalRef).pipe(
            map((updatedReservation) => {
                if (updatedReservation) {
                    Object.assign(reservation, {
                        machine: updatedReservation.machine,
                        startAt: updatedReservation.startAt,
                        endAt: updatedReservation.endAt,
                    });
                }
                return updatedReservation;
            }),
        );
    };

    cancelReservation$ = (reservation: Reservation): Observable<void> => {
        const modalRef = this.modal.openRef(RemoveReservationDialogComponent);
        modalRef.componentInstance.reservation.set(reservation);
        return this.modal.result$<void>(modalRef);
    };

    listReservations$ = (params: Selection) => {
        // Do not fetch byod exams if machine id, room id or external ref in the query params.
        // Also applies if searching for external reservations
        const eventRequest =
            params.roomId || params.machineId || params.externalRef || params.state?.startsWith('EXTERNAL_')
                ? of<ExamEnrolment[]>([])
                : this.http.get<ExamEnrolment[]>('/app/events', { params });
        return forkJoin([this.http.get<Reservation[]>('/app/reservations', { params }), eventRequest]).pipe(
            map(
                ([reservations, enrolments]) =>
                    [
                        ...reservations,
                        // This is hacky. We use examination events as reservations when they are a completely different concept.
                        ...enrolments.map((ee) => this.enrolmentToReservation(ee)),
                    ] as Reservation[],
            ), // FIXME: this is wrong(?) <- don't know how to model anymore with strict checking
            map(
                (all) =>
                    all.map((r) => ({
                        ...r,
                        userAggregate: r.user
                            ? `${r.user.lastName}  ${r.user.firstName}`
                            : (r.externalUserRef ?? r.enrolment?.exam?.id?.toString() ?? ''),
                        org: '',
                        stateOrd: 0,
                        enrolment: r.enrolment ? { ...r.enrolment, teacherAggregate: '' } : r.enrolment,
                    })) as AnyReservation[],
            ),
            map((all) => {
                all.forEach((r) => this.normalizeVariant(r));
                return all
                    .filter((r) => !!r.enrolment?.exam)
                    .map((r) => {
                        const exam = (r.enrolment?.exam.parent || r.enrolment?.exam) as Exam;
                        r.enrolment = {
                            ...(r.enrolment as ExamEnrolment),
                            teacherAggregate: exam.examOwners.map((o) => o.lastName + o.firstName).join(),
                        };
                        r.stateOrd = STATE_ORDER.indexOf(this.printExamState(r));
                        return r;
                    });
            }),
        );
    };

    searchStudents$ = (text$: Observable<string>) =>
        this.searchUsers$(text$, '/app/reservations/students', (a, b) => a.firstName.localeCompare(b.firstName));

    searchOwners$ = (text$: Observable<string>) =>
        this.searchUsers$(text$, '/app/reservations/teachers', (a, b) => a.lastName.localeCompare(b.lastName));

    searchExams$ = (text$: Observable<string>, includeCollaboratives = false) => {
        const listExams$ = (text: string) => {
            const observables: Observable<Exam[] | CollaborativeExam[]>[] = [
                this.http.get<Exam[]>('/app/reservations/exams', { params: { filter: text } }),
            ];
            if (includeCollaboratives) {
                observables.push(this.http.get<CollaborativeExam[]>('/app/iop/exams', { params: { filter: text } }));
            }
            return forkJoin(observables).pipe(map((exams) => exams.flat()));
        };
        return text$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            exhaustMap((term) => (term.length < 2 ? EMPTY : listExams$(term))),
            map((es) => es.sort((a, b) => (a.name as string).localeCompare(b.name as string)).slice(0, 100)),
        );
    };

    private searchUsers$ = (
        text$: Observable<string>,
        url: string,
        sort: (a: User & { name: string }, b: User & { name: string }) => number,
    ) =>
        text$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            exhaustMap((term) =>
                term.length < 2 ? EMPTY : this.http.get<(User & { name: string })[]>(url, { params: { filter: term } }),
            ),
            map((users) => users.sort(sort).slice(0, 100)),
        );

    // Use negative enrolment ID to avoid clashing with reservation IDs
    private enrolmentToReservation = (ee: ExamEnrolment): Partial<Reservation> => ({
        id: -ee.id,
        user: ee.user,
        enrolment: ee,
        startAt: ee.examinationEventConfiguration?.examinationEvent.start,
        endAt:
            DateTime.fromISO(ee.examinationEventConfiguration?.examinationEvent.start as string)
                .plus({ minutes: ee.exam.duration })
                .toISO() || '',
    });

    private normalizeVariant = (r: AnyReservation): void => {
        if (isLocalTransfer(r)) {
            // Transfer exams taken here
            const state = r.enrolment?.externalExam?.finished ? 'EXTERNAL_FINISHED' : 'EXTERNAL_UNFINISHED';
            r.enrolment = {
                ...r.enrolment,
                exam: {
                    id: r.enrolment?.externalExam?.id as number,
                    external: true,
                    examOwners: [],
                    state,
                    parent: null,
                },
            } as LocalTransferExamEnrolment;
        } else if (isRemoteTransfer(r) && r.externalReservation) {
            // Transfer exams taken elsewhere
            r.org = { name: r.externalReservation.orgName, code: r.externalReservation.orgCode };
            r.machine = { name: r.externalReservation.machineName, room: { name: r.externalReservation.roomName } };
        } else if (isCollaborative(r)) {
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
        }
    };
}
