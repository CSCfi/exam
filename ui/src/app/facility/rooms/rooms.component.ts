// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { format, parseISO } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { MachineListComponent } from 'src/app/facility/machines/machines.component';
import { ExceptionListComponent } from 'src/app/facility/schedule/exceptions.component';
import { OpenHoursComponent } from 'src/app/facility/schedule/opening-hours.component';
import { StartingTimeComponent } from 'src/app/facility/schedule/starting-time.component';
import type { DefaultWorkingHours, ExamRoom } from 'src/app/reservation/reservation.model';
import { ExceptionWorkingHours } from 'src/app/reservation/reservation.model';
import type { User } from 'src/app/session/session.service';
import { SessionService } from 'src/app/session/session.service';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { groupBy } from 'src/app/shared/miscellaneous/helpers';
import { RoomService } from './room.service';

interface ExtendedRoom extends ExamRoom {
    addressVisible: boolean;
    availabilityVisible: boolean;
    extendedDwh: DefaultWorkingHoursWithEditing[];
    activate: boolean;
}
export interface DefaultWorkingHoursWithEditing extends DefaultWorkingHours {
    editing: boolean;
    pickStartingTime: { hour: number; minute: number; second: number; millisecond?: number };
    pickEndingTime: { hour: number; minute: number; second: number; millisecond?: number };
    displayStartingTime: { hour: number; minute: number; second: number; millisecond?: number };
    displayEndingTime: { hour: number; minute: number; second: number; millisecond?: number };
}

@Component({
    templateUrl: './rooms.component.html',
    selector: 'xm-rooms',
    standalone: true,
    imports: [
        NgClass,
        NgbPopover,
        RouterLink,
        OpenHoursComponent,
        ExceptionListComponent,
        StartingTimeComponent,
        MachineListComponent,
        TranslateModule,
    ],
    styleUrl: './rooms.component.scss',
})
export class RoomListComponent implements OnInit {
    user: User;
    rooms: ExtendedRoom[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private toast: ToastrService,
        private session: SessionService,
        private roomService: RoomService,
        private translate: TranslateService,
        private timeDateService: DateTimeService,
    ) {
        this.user = this.session.getUser();
    }

    ngOnInit() {
        if (this.user.isAdmin) {
            if (!this.route.snapshot.params.id) {
                this.roomService.getRooms$().subscribe((rooms) => {
                    const roomsWithVisibility = rooms as ExtendedRoom[];
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
                        .filter((r) => r.name)
                        .sort((a, b) => (a.name > b.name ? 1 : -1))
                        .concat(roomsWithNoName);
                });
            }
        } else {
            this.router.navigate(['/staff/admin']);
        }
    }

    switchVisibility(room: ExtendedRoom) {
        if (!room.activate) {
            room.activate = !room.activate;
        }
        room.availabilityVisible = !room.availabilityVisible;
    }

    disableRoom = (room: ExamRoom) => this.roomService.disableRoom(room);

    enableRoom = (room: ExamRoom) => this.roomService.enableRoom(room);

    addExceptions = (exceptions: ExceptionWorkingHours[], examRoom: ExamRoom) => {
        this.roomService.addExceptions([examRoom.id], exceptions).then((data) => {
            const dataList: ExceptionWorkingHours[] = [];
            data.forEach((d) => {
                if (!dataList.map((e) => e.id).includes(d.id)) {
                    dataList.push(d);
                }
            });
            examRoom.calendarExceptionEvents = [...dataList];
        });
    };

    deleteException = (exception: ExceptionWorkingHours, examRoom: ExamRoom) => {
        this.roomService.deleteException(examRoom.id, exception.id);
    };
    getNextExceptionEvent(ees: ExceptionWorkingHours[]): ExceptionWorkingHours[] {
        return ees
            .filter((ee) => new Date(ee.endDate) > new Date())
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 2);
    }
    getFutureExceptionEvent(ees: ExceptionWorkingHours[]): ExceptionWorkingHours[] {
        return ees.filter((ee) => new Date(ee.endDate) > new Date());
    }

    getWorkingHoursDisplayFormat = (workingHours: DefaultWorkingHours[]): string[] => {
        const sorter = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const capitalize = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
        const timePart = (s: string) => format(new Date(s), 'HH:mm');
        const mapping = groupBy(
            workingHours,
            (x: DefaultWorkingHours) => `${timePart(x.startTime)} - ${timePart(x.endTime)}`,
        );
        return Object.keys(mapping).map((k) => {
            const days = mapping[k]
                .sort((a, b) => {
                    const day1 = a.weekday.toLowerCase();
                    const day2 = b.weekday.toLowerCase();
                    return sorter.indexOf(day1) - sorter.indexOf(day2);
                })
                .map((v) => capitalize(this.timeDateService.translateWeekdayName(v.weekday)))
                .join(', ');
            return `${days}: ${k}`;
        });
    };

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
}
