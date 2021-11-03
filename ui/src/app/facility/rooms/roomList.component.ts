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
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/angular';
import * as toast from 'toastr';

import { SessionService } from '../../session/session.service';
import { RoomService } from './room.service';

import type { OnInit } from '@angular/core';
import type { ExamMachine, ExamRoom } from '../../reservation/reservation.model';
import type { User } from '../../session/session.service';
import type { Address } from './room.service';

interface RoomWithAddressVisibility extends ExamRoom {
    addressVisible: boolean;
}

@Component({
    templateUrl: './roomList.component.html',
    selector: 'room-list',
})
export class RoomListComponent implements OnInit {
    user: User;
    times: string[] = [];
    rooms: RoomWithAddressVisibility[] = [];

    constructor(
        private state: StateService,
        private session: SessionService,
        private room: RoomService,
        private translate: TranslateService,
    ) {
        this.user = this.session.getUser();
    }

    ngOnInit() {
        if (this.user.isAdmin) {
            if (!this.state.params.id) {
                this.room.getRooms$().subscribe((rooms) => {
                    this.times = this.room.getTimes();
                    const roomsWithVisibility = rooms as RoomWithAddressVisibility[];
                    this.rooms = roomsWithVisibility.map((r) => ({ ...r, addressVisible: false }));
                    this.rooms.forEach((room) => {
                        room.examMachines = room.examMachines.filter((machine) => {
                            return !machine.archived;
                        });
                    });
                });
            }
        } else {
            this.state.go('staff.admin');
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
        this.room.getDraft$().subscribe(
            (room) => {
                toast.info(this.translate.instant('sitnet_room_draft_created'));
                this.state.go('staff.room', { id: room.id });
            },
            function (error) {
                toast.error(error.data);
            },
        );
    };

    isArchived = (machine: ExamMachine) => {
        return machine.archived === false;
    };

    displayAddress = (address: Address) => {
        if (!address || (!address.street && !address.city && !address.zip)) return 'N/A';
        const street = address.street ? address.street + ', ' : '';
        const city = (address.city || '').toUpperCase();
        return street + address.zip + ' ' + city;
    };
}
