// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, ViewChild, inject } from '@angular/core';
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
    templateUrl: './room.component.html',
    styleUrls: ['./rooms.component.scss'],
    selector: 'xm-room',
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
})
export class RoomComponent implements OnInit {
    @ViewChild('roomForm', { static: false }) roomForm!: NgForm;

    room!: ExamRoom;
    showName = false;
    isInteroperable = false;
    editingMultipleRooms = false;
    internalPasswordInputType = 'password';
    externalPasswordInputType = 'password';

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private roomService = inject(RoomService);
    private interoperability = inject(InteroperabilityService);

    ngOnInit() {
        this.showName = true;
        this.roomService.examVisit().subscribe((data) => {
            this.isInteroperable = data.isExamVisitSupported;
        });

        this.roomService.getRoom$(this.route.snapshot.params.id).subscribe({
            next: (room: ExamRoom) => {
                room.availableForExternals = room.externalRef !== null;
                this.room = room;
            },
            error: (err) => this.toast.error(err),
        });
    }

    disableRoom = () => {
        this.roomService.disableRoom(this.room);
    };

    validateAndUpdateRoom = () => {
        if (this.roomForm.valid) {
            this.updateRoom();
        }
    };

    updateRoom = () => {
        this.roomService.updateRoom$(this.room).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_room_updated'));
            },
            error: (err) => this.toast.error(err),
        });
    };

    saveRoom = () => {
        if (!this.roomService.isAnyExamMachines(this.room))
            this.toast.error(this.translate.instant('i18n_dont_forget_to_add_machines') + ' ' + this.room.name);

        this.roomService.updateRoom$(this.room).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_room_saved'));
                this.router.navigate(['/staff/rooms']);
            },
            error: (err) => this.toast.error(err),
        });
    };

    updateInteroperability = () => {
        this.interoperability.updateFacility$(this.room).subscribe({
            next: (data) => {
                this.room.externalRef = data.externalRef;
                this.room.availableForExternals = data.externalRef !== null;
            },
            error: (err) => {
                this.room.availableForExternals = !this.room.availableForExternals;
                this.toast.error(err.data.message);
            },
        });
    };

    toggleInternalPasswordInputType = () => {
        this.internalPasswordInputType = this.internalPasswordInputType === 'text' ? 'password' : 'text';
    };

    toggleExternalPasswordInputType = () => {
        this.externalPasswordInputType = this.externalPasswordInputType === 'text' ? 'password' : 'text';
    };
}
