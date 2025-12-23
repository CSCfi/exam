// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { AccessibilitySelectorComponent } from 'src/app/facility/accessibility/accessibility-picker.component';
import { AddressComponent } from 'src/app/facility/address/address.component';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { AvailabilityComponent } from './availability.component';
import { InteroperabilityService } from './interoperability.service';
import { RoomService } from './room.service';

@Component({
    templateUrl: './room-edit.component.html',
    styleUrls: ['./rooms.component.scss'],
    selector: 'xm-room-edit',
    imports: [
        FormsModule,
        NgClass,
        NgbPopover,
        AvailabilityComponent,
        AccessibilitySelectorComponent,
        AddressComponent,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomEditComponent {
    @ViewChild('roomForm', { static: false }) roomForm!: NgForm;

    room = signal<ExamRoom | undefined>(undefined);
    showName = signal(false);
    isInteroperable = signal(false);
    internalPasswordInputType = signal<'password' | 'text'>('password');
    externalPasswordInputType = signal<'password' | 'text'>('password');

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private roomService = inject(RoomService);
    private interoperability = inject(InteroperabilityService);

    constructor() {
        this.showName.set(true);
        this.roomService.examVisit().subscribe((data) => {
            this.isInteroperable.set(data.isExamVisitSupported);
        });

        this.roomService.getRoom$(this.route.snapshot.params.id).subscribe({
            next: (room: ExamRoom) => {
                room.availableForExternals = room.externalRef !== null;
                this.room.set(room);
            },
            error: (err) => this.toast.error(err),
        });
    }

    disableRoom = () => {
        const currentRoom = this.room();
        if (currentRoom) {
            this.roomService.disableRoom(currentRoom);
        }
    };

    validateAndUpdateRoom = () => {
        if (this.roomForm.valid) {
            this.updateRoom();
        }
    };

    updateRoom = () => {
        const currentRoom = this.room();
        if (!currentRoom) {
            return;
        }
        this.roomService.updateRoom$(currentRoom).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_room_updated'));
            },
            error: (err) => this.toast.error(err),
        });
    };

    saveRoom = () => {
        const currentRoom = this.room();
        if (!currentRoom) {
            return;
        }
        if (!this.roomService.isAnyExamMachines(currentRoom))
            this.toast.error(this.translate.instant('i18n_dont_forget_to_add_machines') + ' ' + currentRoom.name);

        this.roomService.updateRoom$(currentRoom).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_room_saved'));
                this.router.navigate(['/staff/rooms']);
            },
            error: (err) => this.toast.error(err),
        });
    };

    updateInteroperability = () => {
        const currentRoom = this.room();
        if (!currentRoom) {
            return;
        }
        this.interoperability.updateFacility$(currentRoom).subscribe({
            next: (data) => {
                this.room.update((room) => {
                    if (!room) return room;
                    return {
                        ...room,
                        externalRef: data.externalRef,
                        availableForExternals: data.externalRef !== null,
                    };
                });
            },
            error: (err) => {
                this.room.update((room) => {
                    if (!room) return room;
                    return {
                        ...room,
                        availableForExternals: !room.availableForExternals,
                    };
                });
                this.toast.error(err.data.message);
            },
        });
    };

    toggleInternalPasswordInputType = () => {
        this.internalPasswordInputType.update((type) => (type === 'text' ? 'password' : 'text'));
    };

    toggleExternalPasswordInputType = () => {
        this.externalPasswordInputType.update((type) => (type === 'text' ? 'password' : 'text'));
    };

    toggleShowName = () => {
        this.showName.update((v) => !v);
    };

    updateRoomProperty<K extends keyof ExamRoom>(key: K, value: ExamRoom[K]) {
        this.room.update((r) => (r ? { ...r, [key]: value } : r));
    }

    updateOutOfService(value: boolean) {
        this.updateRoomProperty('outOfService', value);
        this.updateRoom();
    }
}
