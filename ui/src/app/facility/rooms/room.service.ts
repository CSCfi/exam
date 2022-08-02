import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { format, formatISO, parseISO, setHours, setMinutes } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MaintenancePeriod } from '../../exam/exam.model';
import type { ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';
import { DateTimeService } from '../../shared/date/date.service';
import { ConfirmationDialogService } from '../../shared/dialogs/confirmation-dialog.service';
import { ExceptionDialogComponent } from '../schedule/exception-dialog.component';

export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface Day {
    index: number;
    type: string;
}

export type Week = { [day: string]: Day[] };

interface HourBlock {
    start: string;
    end: string;
}

export interface WorkingHour {
    startingHour: string;
    selected: boolean;
}

export interface WeekdayBlock {
    weekday: Weekday;
    blocks: HourBlock[];
}

interface WorkingHoursObject {
    workingHours?: WeekdayBlock[];
    roomIds?: number[];
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

const blocksForDay = (week: Week, day: Weekday) => {
    const blocks = [];
    let tmp = [];
    for (let i = 0; i < week[day].length; ++i) {
        if (week[day][i].type) {
            tmp.push(i);
            if (i === week[day].length - 1) {
                blocks.push(tmp);
                tmp = [];
            }
        } else if (tmp.length > 0) {
            blocks.push(tmp);
            tmp = [];
        }
    }
    return blocks;
};

@Injectable({ providedIn: 'root' })
export class RoomService {
    times = [''];

    week = {
        MONDAY: Array(...new Array(48)).map((x, i) => {
            return { index: i, type: '' };
        }),
        TUESDAY: Array(...new Array(48)).map((x, i) => {
            return { index: i, type: '' };
        }),
        WEDNESDAY: Array(...new Array(48)).map((x, i) => {
            return { index: i, type: '' };
        }),
        THURSDAY: Array(...new Array(48)).map((x, i) => {
            return { index: i, type: '' };
        }),
        FRIDAY: Array(...new Array(48)).map((x, i) => {
            return { index: i, type: '' };
        }),
        SATURDAY: Array(...new Array(48)).map((x, i) => {
            return { index: i, type: '' };
        }),
        SUNDAY: Array(...new Array(48)).map((x, i) => {
            return { index: i, type: '' };
        }),
    };

    constructor(
        private http: HttpClient,
        private ngbModal: NgbModal,
        private translate: TranslateService,
        private toast: ToastrService,
        private dialogs: ConfirmationDialogService,
        private DateTime: DateTimeService,
    ) {
        for (let i = 0; i <= 24; ++i) {
            if (i > 0) {
                this.times.push(i + ':00');
            }
            if (i < 24) {
                this.times.push(i + ':30');
            }
        }
    }

    roomsApi = (id?: number) => (id ? `/app/rooms/${id}` : '/app/rooms');
    addressApi = (id: number) => `/app/address/${id}`;
    availabilityApi = (roomId: number, date: string) => `/app/availability/${roomId}/${date}`;
    workingHoursApi = () => '/app/workinghours';
    examStartingHoursApi = () => '/app/startinghours';
    exceptionsApi = () => '/app/exception';
    exceptionApi = (roomId: number, exceptionId: number) => `/app/rooms/${roomId}/exception/${exceptionId}`;
    draftApi = () => '/app/draft/rooms';

    getRooms$ = () => this.http.get<ExamRoom[]>(this.roomsApi());

    getRoom$ = (id: number) => this.http.get<ExamRoom>(this.roomsApi(id));

    /* TODO, check these text response APIs on backend side, doesn't seem legit */
    updateRoom = (room: ExamRoom) =>
        this.http.put<ExamRoom>(this.roomsApi(room.id), room, { responseType: 'text' as 'json' });

    inactivateRoom$ = (id: number) => this.http.delete<ExamRoom>(this.roomsApi(id));

    activateRoom$ = (id: number) => this.http.post<ExamRoom>(this.roomsApi(id), {});

    updateAddress$ = (address: Address) =>
        this.http.put<Address>(this.addressApi(address.id), address, { responseType: 'text' as 'json' });

    getAvailability$ = (roomId: number, date: string) =>
        this.http.get<Availability[]>(this.availabilityApi(roomId, date));

    updateWorkingHoursData$ = (data: WorkingHoursObject) => this.http.put(this.workingHoursApi(), data);

    updateExamStartingHours$ = (data: { hours: string[]; offset: number; roomIds: number[] }) =>
        this.http.put(this.examStartingHoursApi(), data);

    updateExceptions$ = (roomIds: number[], exception: ExceptionWorkingHours) =>
        this.http.put<ExceptionWorkingHours>(this.exceptionsApi(), { roomIds, exception });

    getDraft$ = () => this.http.get<ExamRoom>(this.draftApi());

    isAnyExamMachines = (room: ExamRoom) => room.examMachines && room.examMachines.length > 0;

    isSomethingSelected = (week: Week) => {
        for (const day in week) {
            if (Object.prototype.hasOwnProperty.call(week, day)) {
                if (!this.isEmpty(week, day as Weekday)) {
                    return true;
                }
            }
        }
        return false;
    };

    isEmpty = (week: Week, day: Weekday) => {
        for (let i = 0; i < week[day].length; ++i) {
            if (week[day][i].type !== '') {
                return false;
            }
        }
        return true;
    };

    getTimes = () => [...this.times];

    getWeek = () => ({ ...this.week });

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

    addException = (ids: number[], exception: ExceptionWorkingHours) =>
        new Promise<ExceptionWorkingHours>((resolve, reject) => {
            this.updateExceptions$(ids, exception).subscribe({
                next: (data: ExceptionWorkingHours) => {
                    this.toast.info(this.translate.instant('sitnet_exception_time_added'));
                    resolve(data);
                },
                error: (error) => {
                    this.toast.error(error);
                    reject();
                },
            });
        });

    openExceptionDialog = (callBack: (exception: ExceptionWorkingHours) => void) =>
        this.ngbModal
            .open(ExceptionDialogComponent, {
                backdrop: 'static',
                keyboard: true,
            })
            .result.then((exception: ExceptionWorkingHours) => {
                callBack(exception);
            })
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            .catch(() => {});

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

    updateWorkingHours$ = (week: Week, ids: number[]): Observable<WeekdayBlock[]> => {
        console.log('Fire from heat');
        const data: WorkingHoursObject = {};
        const workingHours: WeekdayBlock[] = [];
        const times = this.getTimes();
        for (const day in week) {
            if (Object.prototype.hasOwnProperty.call(week, day)) {
                const blocks = blocksForDay(week, day as Weekday);
                const weekdayBlocks: WeekdayBlock = { weekday: day as Weekday, blocks: [] };
                for (let i = 0; i < blocks.length; ++i) {
                    const block = blocks[i];
                    const start = this.formatTime(times[block[0]] || '0:00');
                    const end = this.formatTime(times[block[block.length - 1] + 1]);
                    weekdayBlocks.blocks.push({ start: start, end: end });
                }
                workingHours.push(weekdayBlocks);
            }
        }
        data.workingHours = workingHours;
        data.roomIds = ids;
        return this.updateWorkingHoursData$(data).pipe(
            map(() => {
                console.log('fire from heat');
                this.toast.info(this.translate.instant('sitnet_default_opening_hours_updated'));
                return workingHours;
            }),
        );
    };

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
