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
import { groupBy } from 'ramda';
import type { DefaultWorkingHours, ExamRoom } from '../../reservation/reservation.model';
import { ExceptionWorkingHours } from '../../reservation/reservation.model';
import type { User } from '../../session/session.service';
import { SessionService } from '../../session/session.service';
import { DateTimeService } from '../../shared/date/date.service';
import { RoomService } from './room.service';

interface ExtendedRoom extends ExamRoom {
    addressVisible: boolean;
    availabilityVisible: boolean;
    extendedDwh: DefaultWorkingHoursWithEditing[];
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
                        .sort((a, b) => (a.name > b.name ? 1 : -1))
                        .filter((r) => r.name)
                        .concat(roomsWithNoName);
                });
            }
        } else {
            this.router.navigate(['/staff/admin']);
        }
    }

    disableRoom = (room: ExamRoom) => this.roomService.disableRoom(room);

    enableRoom = (room: ExamRoom) => this.roomService.enableRoom(room);

    addExceptions = (exceptions: ExceptionWorkingHours[], examRoom: ExamRoom) => {
        this.roomService.addExceptions([examRoom.id], exceptions).then((data) => {
            examRoom.calendarExceptionEvents = [...data];
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
        const mapping: Record<string, DefaultWorkingHours[]> = groupBy(
            (wh) => `${timePart(wh.startTime)} - ${timePart(wh.endTime)}`,
            workingHours,
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
