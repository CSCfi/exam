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
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { format, parseISO } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import type { DefaultWorkingHours, ExamMachine, ExamRoom } from '../../reservation/reservation.model';
import { ExceptionWorkingHours } from '../../reservation/reservation.model';
import type { User } from '../../session/session.service';
import { SessionService } from '../../session/session.service';
import type { Address } from './room.service';
import { RoomService } from './room.service';

interface RoomWithAddressVisibility extends ExamRoom {
    addressVisible: boolean;
    availabilityVisible: boolean;
    extendedDWH: DefaultWorkingHoursWithEditing[];
}
interface DefaultWorkingHoursWithEditing extends DefaultWorkingHours {
    editing: boolean;
    pickStartingTime: { hour: number; minute: number; second: number; millisecond?: number };
    pickEndingTime: { hour: number; minute: number; second: number; millisecond?: number };
}

@Component({
    templateUrl: './rooms.component.html',
    selector: 'xm-rooms',
})
export class RoomListComponent implements OnInit {
    user: User;
    times: string[] = [];
    rooms: RoomWithAddressVisibility[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private toast: ToastrService,
        private session: SessionService,
        private room: RoomService,
        private translate: TranslateService,
    ) {
        this.user = this.session.getUser();
    }

    ngOnInit() {
        if (this.user.isAdmin) {
            if (!this.route.snapshot.params.id) {
                this.room.getRooms$().subscribe((rooms) => {
                    this.times = this.room.getTimes();
                    const roomsWithVisibility = rooms as RoomWithAddressVisibility[];
                    this.rooms = roomsWithVisibility.map((r) => {
                        const extendedDWH = r.defaultWorkingHours as DefaultWorkingHoursWithEditing[];
                        return {
                            ...r,
                            addressVisible: false,
                            availabilityVisible: false,
                            extendedDWH: extendedDWH.map((wh) => {
                                return {
                                    ...wh,
                                    editing: false,
                                    pickStartingTime: {
                                        hour: new Date(wh.startTime).getHours(),
                                        minute: new Date(wh.startTime).getMinutes(),
                                        second: 0,
                                        millisecond: 0,
                                    },
                                    pickEndingTime: {
                                        hour: new Date(wh.endTime).getHours(),
                                        minute: new Date(wh.endTime).getMinutes(),
                                        second: 0,
                                        millisecond: 0,
                                    },
                                };
                            }),
                        };
                    });
                    this.rooms.forEach((room) => {
                        room.examMachines = room.examMachines.filter((machine) => {
                            return !machine.archived;
                        });
                    });
                    const roomsWithNoName = this.rooms.filter((r) => !r.name);
                    this.rooms = this.rooms
                        .sort((a, b) => (a.name > b.name ? 1 : -1))
                        .filter((r) => r.name)
                        .concat(roomsWithNoName);
                });
            }
        } else {
            this.router.navigate(['/staff/admin']);
        }
    }

    disableRoom = (room: ExamRoom) => {
        this.room.disableRoom(room);
    };

    enableRoom = (room: ExamRoom) => {
        this.room.enableRoom(room);
    };

    // Called when create exam button is clicked
    createExamRoom = () => {
        this.room.getDraft$().subscribe({
            next: (room) => {
                this.toast.info(this.translate.instant('sitnet_room_draft_created'));
                this.router.navigate(['/staff/room', room.id]);
            },
            error: this.toast.error,
        });
    };

    isArchived = (machine: ExamMachine) => {
        return machine.archived;
    };
    startEditing(wh: DefaultWorkingHoursWithEditing) {
        wh.editing = true;
    }
    updateStartingEdits(
        wh: DefaultWorkingHoursWithEditing,
        event: { hour: number; minute: number; second: number; millisecond?: number },
    ) {
        wh.startTime = new Date(0, 0, 0, event.hour, event.minute).toDateString();
    }
    updateEndingEdits(
        wh: DefaultWorkingHoursWithEditing,
        event: { hour: number; minute: number; second: number; millisecond?: number },
    ) {
        wh.startTime = new Date(0, 0, 0, event.hour, event.minute).toDateString();
    }
    saveEdits(wh: DefaultWorkingHoursWithEditing, examRoom: ExamRoom) {
        this.room.updateWorkingHours$(this.room.getWeek(), [examRoom.id]);
        wh.editing = false;
    }
    deleteDWH(wh: DefaultWorkingHoursWithEditing) {
        wh;
    }
    addException = (exception: ExceptionWorkingHours, examRoom: ExamRoom) => {
        this.room.addException([examRoom.id], exception).then((data) => {
            examRoom.calendarExceptionEvents = [...examRoom.calendarExceptionEvents, data];
        });
    };
    deleteException = (exception: ExceptionWorkingHours, examRoom: ExamRoom) => {
        this.room.deleteException(examRoom.id, exception.id).then(() => {
            examRoom.calendarExceptionEvents = examRoom.calendarExceptionEvents.splice(
                examRoom.calendarExceptionEvents.indexOf(exception),
                1,
            );
        });
    };
    getNextExceptionEvent(ees: ExceptionWorkingHours[]): ExceptionWorkingHours[] {
        return ees.filter((ee) => new Date(ee.endDate) > new Date()).slice(0, 2);
    }
    getWeekDays(workingHours: DefaultWorkingHours[]): string[] {
        return workingHours
            .map(
                (wh, i) =>
                    ' ' +
                    this.getWeekdayName(wh.weekday).charAt(0).toUpperCase() +
                    this.getWeekdayName(wh.weekday).slice(1) +
                    (workingHours[i + 1]?.startTime == wh.startTime && workingHours[i + 1]?.endTime == wh.endTime
                        ? ','
                        : ' ' + format(new Date(wh.startTime), 'HH:mm') + '-' + format(new Date(wh.endTime), 'HH:mm;')),
            )
            .join('')
            .split(';');
    }
    workingHourFormat(time: string): string {
        return format(new Date(time), 'HH:mm');
    }
    getWeekdayName(weekDay: string, long?: boolean): string {
        const length = long ? 'long' : 'short';
        const lang = this.translate.currentLang;
        const locale = lang.toLowerCase() + '-' + lang.toUpperCase();
        const options: Intl.DateTimeFormatOptions = { weekday: length };
        switch (weekDay) {
            case 'MONDAY':
                return this.getDateForWeekday(1).toLocaleDateString(locale, options);
            case 'TUESDAY':
                return this.getDateForWeekday(2).toLocaleDateString(locale, options);
            case 'WEDNESDAY':
                return this.getDateForWeekday(3).toLocaleDateString(locale, options);
            case 'THURSDAY':
                return this.getDateForWeekday(4).toLocaleDateString(locale, options);
            case 'FRIDAY':
                return this.getDateForWeekday(5).toLocaleDateString(locale, options);
            case 'SATURDAY':
                return this.getDateForWeekday(6).toLocaleDateString(locale, options);
            case 'SUNDAY':
                return this.getDateForWeekday(7).toLocaleDateString(locale, options);
        }
        return '';
    }
    getDateForWeekday(ordinal: number): Date {
        const now = new Date();
        const distance = ordinal - now.getDay();
        return new Date(now.setDate(now.getDate() + distance));
    }
    formatDate = (exception: ExceptionWorkingHours) => {
        if (!exception?.startDate || !exception?.endDate) {
            return;
        }
        const fmt = 'dd.MM.yyyy HH:mm';
        const start = parseISO(exception.startDate);
        const end = parseISO(exception.endDate);
        return (
            format(start, fmt) +
            ' - ' +
            (format(start, 'dd.MM.yyyy') == format(end, 'dd.MM.yyyy') ? format(end, 'HH:mm') : format(end, fmt))
        );
    };

    displayAddress = (address: Address) => {
        if (!address || (!address.street && !address.city && !address.zip)) return 'N/A';
        const street = address.street ? address.street + ', ' : '';
        const city = (address.city || '').toUpperCase();
        return street + address.zip + ' ' + city;
    };
}
