// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { format, formatISO, parseISO, setHours, setMinutes } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { from, noop, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Address, Availability, MaintenancePeriod, WorkingHour } from 'src/app/facility/facility.model';
import { ExceptionDialogComponent } from 'src/app/facility/schedule/exception-dialog.component';
import type { DefaultWorkingHours, ExamRoom, ExceptionWorkingHours } from 'src/app/reservation/reservation.model';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';

@Injectable({ providedIn: 'root' })
export class RoomService {
    constructor(
        private http: HttpClient,
        private ngbModal: NgbModal,
        private translate: TranslateService,
        private toast: ToastrService,
        private dialogs: ConfirmationDialogService,
        private DateTime: DateTimeService,
        private errorHandler: ErrorHandlingService,
    ) {}

    roomsApi = (id?: number) => (id ? `/app/rooms/${id}` : '/app/rooms');
    availabilityApi = (roomId: number, date: string) => `/app/availability/${roomId}/${date}`;
    exceptionApi = (roomId: number, exceptionId: number) => `/app/rooms/${roomId}/exception/${exceptionId}`;

    getRooms$ = (): Observable<ExamRoom[]> =>
        this.http
            .get<ExamRoom[]>(this.roomsApi())
            .pipe(catchError((err) => this.errorHandler.handle(err, 'RoomService.getRooms$')));

    getRoom$ = (id: number) => this.http.get<ExamRoom>(this.roomsApi(id));

    /* TODO, check these text response APIs on backend side, doesn't seem legit */
    updateRoom = (room: ExamRoom) =>
        this.http.put<ExamRoom>(this.roomsApi(room.id), room, { responseType: 'text' as 'json' });

    inactivateRoom$ = (id: number) => this.http.delete<ExamRoom>(this.roomsApi(id));

    activateRoom$ = (id: number) => this.http.post<ExamRoom>(this.roomsApi(id), {});

    updateAddress$ = (address: Address) =>
        this.http.put<Address>(`/app/address/${address.id}`, address, { responseType: 'text' as 'json' });

    getAvailability$ = (roomId: number, date: string) =>
        this.http.get<Availability[]>(this.availabilityApi(roomId, date));

    updateExamStartingHours$ = (data: { hours: string[]; offset: number; roomIds: number[] }) =>
        this.http.put('/app/startinghours', data);

    updateExceptions$ = (roomIds: number[], exceptions: ExceptionWorkingHours[]) =>
        this.http.put<ExceptionWorkingHours[]>('/app/exception', { roomIds, exceptions });

    getDraft$ = () => this.http.get<ExamRoom>('/app/draft/rooms');

    isAnyExamMachines = (room: ExamRoom) => room.examMachines && room.examMachines.length > 0;

    disableRoom = (room: ExamRoom) => {
        this.http
            .put<void>(`/app/rooms/${room.id}/state`, { active: false })
            .pipe(
                tap(() => {
                    room.state = 'INACTIVE';
                    this.toast.info(this.translate.instant('i18n_room_disabled'));
                }),
                catchError((err) => this.errorHandler.handle(err, 'RoomService.disableRoom')),
            )
            .subscribe();
    };

    enableRoom = (room: ExamRoom) => {
        this.http
            .put<void>(`/app/rooms/${room.id}/state`, { active: true })
            .pipe(
                tap(() => {
                    room.state = 'ACTIVE';
                    this.toast.info(this.translate.instant('i18n_room_enabled'));
                }),
                catchError((err) => this.errorHandler.handle(err, 'RoomService.enableRoom')),
            )
            .subscribe();
    };

    addExceptions$ = (roomIds: number[], exceptions: ExceptionWorkingHours[]): Observable<ExceptionWorkingHours[]> =>
        this.http
            .post<ExceptionWorkingHours[]>('/app/calendar/exception', { roomIds: roomIds, exceptionEvents: exceptions })
            .pipe(
                tap(() => this.toast.info(this.translate.instant('i18n_exception_added'))),
                catchError((err) => this.errorHandler.handle(err, 'RoomService.addExceptions$')),
            );

    openExceptionDialog = (
        callBack: (exception: ExceptionWorkingHours[]) => void,
        outOfService?: boolean,
        exceptions?: ExceptionWorkingHours[],
    ) => {
        const modalRef = this.ngbModal.open(ExceptionDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modalRef.componentInstance.outOfService = outOfService;
        modalRef.componentInstance.exceptions = exceptions;
        from(modalRef.result).subscribe({
            next: (exceptions: ExceptionWorkingHours[]) => {
                callBack(exceptions);
            },
            error: noop,
        });
    };
    deleteException$ = (roomId: number, exceptionId: number) =>
        this.removeException$(roomId, exceptionId).pipe(
            tap(() => {
                this.toast.info(this.translate.instant('i18n_exception_time_removed'));
            }),
        );

    formatExceptionEvent = (event: ExceptionWorkingHours) => {
        event.startDate = formatISO(parseISO(event.startDate));
        event.endDate = formatISO(parseISO(event.endDate));
    };

    updateStartingHours$ = (hours: WorkingHour[], offset: number, roomIds: number[]) => {
        const selected = hours.filter((hour) => hour.selected).map((hour) => this.formatTime(hour.startingHour));
        const data = { hours: selected, offset, roomIds };

        return this.updateExamStartingHours$(data).pipe(
            tap(() => {
                this.toast.info(this.translate.instant('i18n_exam_starting_hours_updated'));
            }),
        );
    };

    updateWorkingHours$ = (hours: DefaultWorkingHours, ids: number[]) =>
        this.http.post<{ id: number }>('/app/workinghours', { workingHours: hours, roomIds: ids });
    removeWorkingHours$ = (id: number, roomId: number) => this.http.delete<void>(`/app/workinghours/${roomId}/${id}`);
    listMaintenancePeriods$ = () => this.http.get<MaintenancePeriod[]>('/app/maintenance');
    createMaintenancePeriod$ = (period: MaintenancePeriod) =>
        this.http.post<MaintenancePeriod>('/app/maintenance', period);
    updateMaintenancePeriod$ = (period: MaintenancePeriod) => this.http.put(`/app/maintenance/${period.id}`, period);
    removeMaintenancePeriod$ = (period: MaintenancePeriod) => this.http.delete(`/app/maintenance/${period.id}`);
    examVisit = () => this.http.get<{ isExamVisitSupported: boolean }>('/app/settings/iop/examVisit');

    private removeException$ = (roomId: number, exceptionId: number) =>
        this.http.delete<void>(this.exceptionApi(roomId, exceptionId), { responseType: 'text' as 'json' });

    private formatTime = (time: string) => {
        const hours = this.DateTime.isDST(new Date()) ? 1 : 0;
        return format(
            setMinutes(setHours(new Date(), parseInt(time.split(':')[0]) + hours), parseInt(time.split(':')[1])),
            'dd.MM.yyyy HH:mmXXX',
        );
    };
}
