import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import * as moment from 'moment';
import * as toast from 'toastr';
import { cloneDeep } from 'lodash';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ConfirmationDialogService } from '../../utility/dialogs/confirmationDialog.service';
import { ExceptionDialogComponent } from '../schedule/exceptionDialog.component';
import { ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';

export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface Day {
    index: number;
    type: string;
}

export type Week = Record<Weekday, Day[]>;

interface HourBlock {
    start: string;
    end: string;
}

export interface WorkingHour {
    startingHour: string;
    selected: boolean;
}

interface WeekdayBlock {
    weekday: Weekday;
    blocks: HourBlock[];
}

interface WorkingHoursObject {
    workingHours?: WeekdayBlock[];
    roomIds?: number[];
}

export interface Availability {
    start: Date;
    end: Date;
    total: number;
    reserved: number;
}

export interface Address {
    id: number;
    city: string;
    zip: string;
    street: string;
}

export interface InteroperableRoom extends ExamRoom {
    availableForExternals: boolean;
    externalRef: string | null;
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

const formatTime = (time: string) => {
    const hours = moment().isDST() ? 1 : 0;
    return moment()
        .set('hour', parseInt(time.split(':')[0]) + hours)
        .set('minute', parseInt(time.split(':')[1]))
        .format('DD.MM.YYYY HH:mmZZ');
};

@Injectable()
export class RoomService {
    times = [''];

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private dialogs: ConfirmationDialogService,
        private state: StateService,
        private ngbModal: NgbModal,
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

    roomsApi = (id?: number) => (id ? `/app/rooms/${id}` : '/app/rooms');
    addressApi = (id: number) => `/app/address/${id}`;
    availabilityApi = (roomId: number, date: string) => `/app/availability/${roomId}/${date}`;
    workingHoursApi = () => '/app/workinghours';
    examStartingHoursApi = () => '/app/startinghours';
    exceptionsApi = () => '/app/exception';
    exceptionApi = (roomId: number, exceptionId: number) => `/app/rooms/${roomId}/exception/${exceptionId}`;
    draftApi = () => '/app/draft/rooms';

    getRooms = () => this.http.get<ExamRoom[]>(this.roomsApi());

    getRoom = (id: number) => this.http.get<ExamRoom>(this.roomsApi(id));

    updateRoom = (room: ExamRoom) =>
        this.http.put<ExamRoom>(this.roomsApi(room.id), room, { responseType: 'text' as any });

    inactivateRoom = (id: number) => this.http.delete<ExamRoom>(this.roomsApi(id));

    activateRoom = (id: number) => this.http.post<ExamRoom>(this.roomsApi(id), {});

    updateAddress = (address: Address) =>
        this.http.put<Address>(this.addressApi(address.id), address, { responseType: 'text' as any });

    getAvailability = (roomId: number, date: string) => this.http.get<Availability>(this.availabilityApi(roomId, date));

    updateWorkingHoursData = (data: WorkingHoursObject) => this.http.put(this.workingHoursApi(), data);

    updateExamStartingHours = (data: { hours: string[]; offset: number; roomIds: number[] }) =>
        this.http.put(this.examStartingHoursApi(), data);

    updateExceptions = (roomIds: number[], exception: ExceptionWorkingHours) =>
        this.http.put<ExceptionWorkingHours>(this.exceptionsApi(), { roomIds, exception });

    removeException = (roomId: number, exceptionId: number) =>
        this.http.delete<void>(this.exceptionApi(roomId, exceptionId), { responseType: 'text' as any });

    getDraft = () => this.http.get<ExamRoom>(this.draftApi());

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

    getTimes = () => {
        return cloneDeep(this.times);
    };

    getWeek = () => {
        return cloneDeep(this.week);
    };

    disableRoom = (room: ExamRoom) => {
        const dialog = this.dialogs.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_confirm_room_inactivation'),
        );
        dialog.result.then(() =>
            this.inactivateRoom(room.id)
                .toPromise()
                .then(() => {
                    toast.info(this.translate.instant('sitnet_room_inactivated'));
                    this.state.reload();
                })
                .catch(error => {
                    toast.error(error.data);
                }),
        );
    };

    enableRoom = (room: ExamRoom) =>
        this.activateRoom(room.id)
            .toPromise()
            .then(() => {
                toast.info(this.translate.instant('sitnet_room_activated'));
            })
            .catch(error => {
                toast.error(error.data);
            });

    addException = (ids: number[], exception: ExceptionWorkingHours) =>
        new Promise<ExceptionWorkingHours>((resolve, reject) => {
            this.updateExceptions(ids, exception).subscribe(
                (data: ExceptionWorkingHours) => {
                    toast.info(this.translate.instant('sitnet_exception_time_added'));
                    resolve(data);
                },
                error => {
                    toast.error(error.data);
                    reject();
                },
            );
        });

    openExceptionDialog = (callBack: (exception: ExceptionWorkingHours) => void) => {
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
    };

    deleteException = (roomId: number, exceptionId: number) =>
        new Promise<void>((resolve, reject) => {
            this.removeException(roomId, exceptionId).subscribe(
                () => {
                    toast.info(this.translate.instant('sitnet_exception_time_removed'));
                    resolve();
                },
                error => {
                    toast.error(error);
                    reject(error);
                },
            );
        });

    formatExceptionEvent = (event: ExceptionWorkingHours) => {
        event.startDate = moment(event.startDate).format();
        event.endDate = moment(event.endDate).format();
    };

    updateStartingHours = (hours: WorkingHour[], offset: number, roomIds: number[]) =>
        new Promise<void>((resolve, reject) => {
            const selected = hours.filter(hour => hour.selected).map(hour => formatTime(hour.startingHour));
            const data = { hours: selected, offset, roomIds };

            this.updateExamStartingHours(data).subscribe(
                () => {
                    toast.info(this.translate.instant('sitnet_exam_starting_hours_updated'));
                    resolve();
                },
                error => {
                    toast.error(error.data);
                    reject();
                },
            );
        });

    updateWorkingHours = (week: Week, ids: number[]) => {
        const data: WorkingHoursObject = {};
        const workingHours: WeekdayBlock[] = [];
        const times = this.getTimes();
        for (const day in week) {
            if (Object.prototype.hasOwnProperty.call(week, day)) {
                const blocks = blocksForDay(week, day as Weekday);
                const weekdayBlocks: WeekdayBlock = { weekday: day as Weekday, blocks: [] };
                for (let i = 0; i < blocks.length; ++i) {
                    const block = blocks[i];
                    const start = formatTime(times[block[0]] || '0:00');
                    const end = formatTime(times[block[block.length - 1] + 1]);
                    weekdayBlocks.blocks.push({ start: start, end: end });
                }
                workingHours.push(weekdayBlocks);
            }
        }
        data.workingHours = workingHours;
        data.roomIds = ids;
        this.updateWorkingHoursData(data).subscribe(
            () => {
                toast.info(this.translate.instant('sitnet_default_opening_hours_updated'));
            },
            error => {
                toast.error(error.data);
            },
        );
    };
}
