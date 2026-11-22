// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { RoomComponent } from './room.component';
import { RoomService } from './room.service';

interface ExtendedRoom extends ExamRoom {
    addressVisible: boolean;
    availabilityVisible: boolean;
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
})
export class RoomListComponent {
    readonly rooms = signal<ExtendedRoom[]>([]);
    readonly user: User;

    private readonly session = inject(SessionService);
    private readonly roomService = inject(RoomService);

    constructor() {
        this.user = this.session.getUser();
        this.roomService.getRooms$().subscribe((rooms) => {
            const roomsWithVisibility = rooms as ExtendedRoom[];
            const processedRooms = roomsWithVisibility.map((r) => {
                return {
                    ...r,
                    addressVisible: false,
                    availabilityVisible: false,
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
