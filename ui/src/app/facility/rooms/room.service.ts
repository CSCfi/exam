import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { format, formatISO, parseISO, setHours, setMinutes } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { noop } from 'rxjs';
import { MaintenancePeriod } from '../../exam/exam.model';
import type { DefaultWorkingHours, ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';
import { DateTimeService } from '../../shared/date/date.service';
import { ConfirmationDialogService } from '../../shared/dialogs/confirmation-dialog.service';
import { ExceptionDialogComponent } from '../schedule/exception-dialog.component';

export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface Day {
    index: number;
    type: string;
}

export type Week = { [day: string]: Day[] };

export interface WorkingHour {
    startingHour: string;
    selected: boolean;
}

export interface Availability {
    start: string;
    end: string;
    total: number;
    reserved: number;
}

export interface Address {
    id: number;
    city: string;
    zip: string;
    street: string;
}

@Injectable({ providedIn: 'root' })
export class RoomService {
    constructor(
        private http: HttpClient,
        private ngbModal: NgbModal,
        private translate: TranslateService,
        private toast: ToastrService,
        private dialogs: ConfirmationDialogService,
        private DateTime: DateTimeService,
    ) {}

    roomsApi = (id?: number) => (id ? `/app/rooms/${id}` : '/app/rooms');
    availabilityApi = (roomId: number, date: string) => `/app/availability/${roomId}/${date}`;
    exceptionApi = (roomId: number, exceptionId: number) => `/app/rooms/${roomId}/exception/${exceptionId}`;

    getRooms$ = () => this.http.get<ExamRoom[]>(this.roomsApi());

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

    disableRoom = (room: ExamRoom) =>
        this.dialogs
            .open$(this.translate.instant('sitnet_confirm'), this.translate.instant('sitnet_confirm_room_inactivation'))
            .subscribe({
                next: () =>
                    this.inactivateRoom$(room.id).subscribe({
                        next: () => {
                            this.toast.info(this.translate.instant('sitnet_room_inactivated'));
                            room.state = 'INACTIVE';
                        },
                        error: this.toast.error,
                    }),
                error: this.toast.error,
            });

    enableRoom = (room: ExamRoom) =>
        this.activateRoom$(room.id).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('sitnet_room_activated'));
                room.state = 'ACTIVE';
            },
            error: this.toast.error,
        });

    addExceptions = (ids: number[], exceptions: ExceptionWorkingHours[]) =>
        new Promise<ExceptionWorkingHours[]>((resolve, reject) => {
            this.updateExceptions$(ids, exceptions).subscribe({
                next: (data: ExceptionWorkingHours[]) => {
                    this.toast.info(this.translate.instant('sitnet_exception_time_added'));
                    resolve(data);
                },
                error: (error) => {
                    this.toast.error(error);
                    reject();
                },
            });
        });

    openExceptionDialog = (callBack: (exception: ExceptionWorkingHours[]) => void) =>
        this.ngbModal
            .open(ExceptionDialogComponent, {
                backdrop: 'static',
                keyboard: true,
                size: 'lg',
            })
            .result.then((exception: ExceptionWorkingHours[]) => {
                callBack(exception);
            })
            .catch(noop);

    deleteException = (roomId: number, exceptionId: number) =>
        new Promise<void>((resolve, reject) => {
            this.removeException$(roomId, exceptionId).subscribe({
                next: () => {
                    this.toast.info(this.translate.instant('sitnet_exception_time_removed'));
                    resolve();
                },
                error: (error) => {
                    this.toast.error(error);
                    reject(error);
                },
            });
        });

    formatExceptionEvent = (event: ExceptionWorkingHours) => {
        event.startDate = formatISO(parseISO(event.startDate));
        event.endDate = formatISO(parseISO(event.endDate));
    };

    updateStartingHours = (hours: WorkingHour[], offset: number, roomIds: number[]) =>
        new Promise<void>((resolve, reject) => {
            const selected = hours.filter((hour) => hour.selected).map((hour) => this.formatTime(hour.startingHour));
            const data = { hours: selected, offset, roomIds };

            this.updateExamStartingHours$(data).subscribe({
                next: () => {
                    this.toast.info(this.translate.instant('sitnet_exam_starting_hours_updated'));
                    resolve();
                },
                error: (error) => {
                    this.toast.error(error.data);
                    reject();
                },
            });
        });

    updateWorkingHours$ = (hours: DefaultWorkingHours, ids: number[]) =>
        this.http.post<{ id: number }>('/app/workinghours', { workingHours: hours, roomIds: ids });
    removeWorkingHours$ = (id: number) => this.http.delete<void>(`/app/workinghours/${id}`);
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
