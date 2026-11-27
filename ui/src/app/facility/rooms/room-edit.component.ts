// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
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
        FormField,
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
    readonly room = signal<ExamRoom | undefined>(undefined);
    readonly showName = signal(false);
    readonly isInteroperable = signal(false);
    readonly internalPasswordInputType = signal<'password' | 'text'>('password');
    readonly externalPasswordInputType = signal<'password' | 'text'>('password');
    readonly roomDetailsForm = form(
        linkedSignal(() => ({
            roomCode: this.room()?.roomCode || '',
            buildingName: this.room()?.buildingName || '',
            campus: this.room()?.campus || '',
            internalPassword: this.room()?.internalPassword || '',
            externalPassword: this.room()?.externalPassword || '',
        })),
        (path) => {
            required(path.roomCode);
        },
    );

    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly roomService = inject(RoomService);
    private readonly interoperability = inject(InteroperabilityService);

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
        if (!this.roomDetailsForm.roomCode().invalid()) {
            this.syncRoomDetailsFromForm();
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
        if (!this.room()) {
            return;
        }
        if (this.roomDetailsForm.roomCode().invalid()) {
            return;
        }
        this.syncRoomDetailsFromForm();
        const updatedRoom = this.room();
        if (!updatedRoom) return;
        if (!this.roomService.isAnyExamMachines(updatedRoom))
            this.toast.error(this.translate.instant('i18n_dont_forget_to_add_machines') + ' ' + updatedRoom.name);

        this.roomService.updateRoom$(updatedRoom).subscribe({
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

    onRoomTextInput = (key: keyof ExamRoom, event: Event) => {
        const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
        this.room.update((r) => (r ? { ...r, [key]: value } : r));
    };

    onAvailableForExternalsChange = (event: Event) => {
        this.updateRoomProperty('availableForExternals', (event.target as HTMLInputElement).checked);
        this.updateInteroperability();
    };

    onOutOfServiceChange = (event: Event) => {
        this.updateOutOfService((event.target as HTMLInputElement).checked);
    };

    updateRoomProperty<K extends keyof ExamRoom>(key: K, value: ExamRoom[K]) {
        this.room.update((r) => (r ? { ...r, [key]: value } : r));
    }

    updateOutOfService(value: boolean) {
        this.updateRoomProperty('outOfService', value);
        this.updateRoom();
    }

    private syncRoomDetailsFromForm() {
        const currentRoom = this.room();
        if (!currentRoom) return;

        this.room.set({
            ...currentRoom,
            roomCode: this.roomDetailsForm.roomCode().value() || '',
            buildingName: this.roomDetailsForm.buildingName().value() || '',
            campus: this.roomDetailsForm.campus().value() || '',
            internalPassword: this.roomDetailsForm.internalPassword().value() || '',
            externalPassword: this.roomDetailsForm.externalPassword().value() || '',
        });
    }
}
