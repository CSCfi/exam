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
import { Component, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import type { ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';
import { AccessibilitySelectorComponent } from '../accessibility/accessibility-picker.component';
import { AddressComponent } from '../address/address.component';
import { AvailabilityComponent } from './availability.component';
import { InteroperabilityService } from './interoperability.service';
import { RoomService } from './room.service';

@Component({
    templateUrl: './room.component.html',
    selector: 'xm-room',
    standalone: true,
    imports: [
        FormsModule,
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

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private translate: TranslateService,
        private toast: ToastrService,
        private roomService: RoomService,
        private interoperability: InteroperabilityService,
    ) {}

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

    addExceptions = (exceptions: ExceptionWorkingHours[]) => {
        this.roomService.addExceptions([this.room.id], exceptions).then((data) => {
            this.room.calendarExceptionEvents = [...this.room.calendarExceptionEvents, ...data];
        });
    };

    deleteException = (exception: ExceptionWorkingHours) => {
        this.roomService.deleteException(this.room.id, exception.id).then(() => {
            this.room.calendarExceptionEvents = this.room.calendarExceptionEvents.splice(
                this.room.calendarExceptionEvents.indexOf(exception),
                1,
            );
        });
    };

    disableRoom = () => {
        this.roomService.disableRoom(this.room);
    };

    enableRoom = () => {
        this.roomService.enableRoom(this.room);
    };

    validateInputAndUpdateRoom = (event: FocusEvent & { target: HTMLInputElement | HTMLTextAreaElement }) => {
        const { name } = event.target;
        const ctrl = this.roomForm.controls[name];
        if (ctrl.valid) {
            this.updateRoom();
        }
    };

    validateAndUpdateRoom = () => {
        if (this.roomForm.valid) {
            this.updateRoom();
        }
    };

    updateRoom = () => {
        this.roomService.updateRoom(this.room).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_room_updated'));
            },
            error: (err) => this.toast.error(err),
        });
    };

    saveRoom = () => {
        if (!this.roomService.isAnyExamMachines(this.room))
            this.toast.error(this.translate.instant('i18n_dont_forget_to_add_machines') + ' ' + this.room.name);

        this.roomService.updateRoom(this.room).subscribe({
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
}
