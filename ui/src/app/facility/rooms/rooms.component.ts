// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DefaultWorkingHoursWithEditing } from 'src/app/facility/facility.model';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { RoomComponent } from './room.component';
import { RoomService } from './room.service';

interface ExtendedRoom extends ExamRoom {
    addressVisible: boolean;
    availabilityVisible: boolean;
    extendedDwh: DefaultWorkingHoursWithEditing[];
    activate: boolean;
}

@Component({
    template: `
        @for (room of rooms(); track room.id) {
            <xm-room [room]="room" />
        }
    `,
    selector: 'xm-rooms',
    imports: [TranslateModule, RoomComponent],
    styleUrl: './rooms.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomListComponent {
    user: User;
    rooms = signal<ExtendedRoom[]>([]);

    private session = inject(SessionService);
    private roomService = inject(RoomService);

    constructor() {
        this.user = this.session.getUser();
        this.roomService.getRooms$().subscribe((rooms) => {
            const roomsWithVisibility = rooms as ExtendedRoom[];
            const processedRooms = roomsWithVisibility.map((r) => {
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
            processedRooms.forEach((room) => {
                room.examMachines = room.examMachines.filter((machine) => {
                    return !machine.archived;
                });
            });
            const roomsWithNoName = processedRooms.filter((r) => !r.name);
            const sortedRooms = processedRooms
                .filter((r) => r.name)
                .sort((a, b) => (a.name > b.name ? 1 : -1))
                .concat(roomsWithNoName);
            this.rooms.set(sortedRooms);
        });
    }
}
