// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { Address, Availability, MaintenancePeriod, WorkingHour } from 'src/app/facility/facility.model';
import { ExceptionDialogComponent } from 'src/app/facility/schedule/exception-dialog.component';
import type { DefaultWorkingHours, ExamRoom, ExceptionWorkingHours } from 'src/app/reservation/reservation.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';

@Injectable({ providedIn: 'root' })
export class RoomService {
    private readonly http = inject(HttpClient);
    private readonly modal = inject(ModalService);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly dialogs = inject(ConfirmationDialogService);

    roomsApi = (id?: number) => (id ? `/app/rooms/${id}` : '/app/rooms');
    availabilityApi = (roomId: number, date: string) => `/app/availability/${roomId}/${date}`;
    exceptionApi = (roomId: number, exceptionId: number) => `/app/rooms/${roomId}/exception/${exceptionId}`;

    getRooms$ = () => this.http.get<ExamRoom[]>(this.roomsApi());

    getRoom$ = (id: number) => this.http.get<ExamRoom>(this.roomsApi(id));

    /* TODO, check these text response APIs on backend side, doesn't seem legit */
    updateRoom$ = (room: ExamRoom) =>
        this.http.put<ExamRoom>(this.roomsApi(room.id), room, { responseType: 'text' as 'json' });

    inactivateRoom$ = (id: number) => this.http.delete<ExamRoom>(this.roomsApi(id));

    activateRoom$ = (id: number) => this.http.post<ExamRoom>(this.roomsApi(id), {});

    updateAddress$ = (address: Address) =>
        this.http.put<Address>(`/app/address/${address.id}`, address, { responseType: 'text' as 'json' });

    getAvailability$ = (roomId: number, date: string) =>
        this.http.get<Availability[]>(this.availabilityApi(roomId, date));

    updateExamStartingHours$ = (data: { hours: string[]; roomIds: number[] }) =>
        this.http.put('/app/startinghours', data);

    updateExceptions$ = (roomIds: number[], exceptions: ExceptionWorkingHours[]) =>
        this.http.put<ExceptionWorkingHours[]>('/app/exception', { roomIds, exceptions });

    getDraft$ = () => this.http.get<ExamRoom>('/app/draft/rooms');

    isAnyExamMachines = (room: ExamRoom) => room.examMachines && room.examMachines.length > 0;

    disableRoom = (room: ExamRoom) =>
        this.dialogs
            .open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_confirm_room_inactivation'))
            .subscribe({
                next: () =>
                    this.inactivateRoom$(room.id).subscribe({
                        next: () => {
                            this.toast.info(this.translate.instant('i18n_room_inactivated'));
                            room.state = 'INACTIVE';
                        },
                        error: (err) => this.toast.error(err),
                    }),
            });

    enableRoom = (room: ExamRoom) =>
        this.activateRoom$(room.id).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_room_activated'));
                room.state = 'ACTIVE';
            },
            error: (err) => this.toast.error(err),
        });

    addExceptions$ = (ids: number[], exceptions: ExceptionWorkingHours[]) =>
        this.updateExceptions$(ids, exceptions).pipe(
            tap({
                next: () => this.toast.info(this.translate.instant('i18n_exception_time_added')),
                error: (error) => this.toast.error(error),
            }),
        );

    openExceptionDialog = (
        callBack: (exception: ExceptionWorkingHours[]) => void,
        outOfService?: boolean,
        exceptions?: ExceptionWorkingHours[],
    ) => {
        const modalRef = this.modal.openRef(ExceptionDialogComponent, { size: 'lg' });
        modalRef.componentInstance.outOfService.set(outOfService ?? true);
        modalRef.componentInstance.exceptions.set(exceptions ?? []);
        this.modal.result$<ExceptionWorkingHours[]>(modalRef).subscribe(callBack);
    };
    deleteException$ = (roomId: number, exceptionId: number) =>
        this.removeException$(roomId, exceptionId).pipe(
            tap({
                next: () => this.toast.info(this.translate.instant('i18n_exception_time_removed')),
                error: (error) => this.toast.error(error),
            }),
        );

    updateStartingHours$ = (hours: WorkingHour[], roomIds: number[]) => {
        const selected = hours.filter((hour) => hour.selected).map((hour) => hour.startingHour);
        const data = { hours: selected, roomIds };

        return this.updateExamStartingHours$(data).pipe(
            tap({
                next: () => this.toast.info(this.translate.instant('i18n_exam_starting_hours_updated')),
                error: (error) => this.toast.error(error.data),
            }),
            map(() => void 0),
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
}
