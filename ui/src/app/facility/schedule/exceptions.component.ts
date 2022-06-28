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
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { format, parseISO } from 'date-fns';
import type { ExceptionWorkingHours } from '../../reservation/reservation.model';
import { RoomService } from '../rooms/room.service';

@Component({
    selector: 'xm-exceptions',
    template: `<div class="top-row flex marl5" *ngIf="!hideTitle">
            <h3 class="col-md-12 header-text">{{ 'sitnet_exception_datetimes' | translate }}</h3>
        </div>

        <div class="col-md-12">
            <div class="flex" *ngFor="let exception of exceptions | filterBy: filter">
                <div class="col-md-4 min-width-300">
                    {{ formatDate(exception) }}
                </div>
                <div class="text-danger marr10" *ngIf="exception.outOfService">
                    {{ 'sitnet_room_out_of_service' | translate }}
                </div>
                <div class="text-info " *ngIf="!exception.outOfService">
                    {{ 'sitnet_room_in_service' | translate }}
                </div>
                <div>
                    <a class="pointer" (click)="deleteException(exception)">{{ 'sitnet_exam_remove' | translate }}</a>
                </div>
            </div>
        </div>
        <div class="main-row" *ngIf="!hideButton">
            <div class="col-md-12">
                <button (click)="addException()" class="btn btn-primary">
                    {{ 'sitnet_add' | translate }}
                </button>
            </div>
        </div> `,
})
export class ExceptionListComponent {
    @Input() exceptions: ExceptionWorkingHours[] = [];
    @Input() hideButton = false;
    @Input() hideTitle = false;
    @Input() filter: (exception: ExceptionWorkingHours) => boolean;
    @Output() created = new EventEmitter<ExceptionWorkingHours>();
    @Output() removed = new EventEmitter<ExceptionWorkingHours>();

    constructor(private roomService: RoomService) {
        this.filter = () => true;
    }

    formatDate = (exception: ExceptionWorkingHours) => {
        const fmt = 'dd.MM.yyyy HH:mm';
        const start = parseISO(exception.startDate);
        const end = parseISO(exception.endDate);
        return format(start, fmt) + ' - ' + format(end, fmt);
    };

    addException = () => {
        this.roomService.openExceptionDialog(this.createExceptionCallback);
    };

    createExceptionCallback = (exception: ExceptionWorkingHours) => {
        this.created.emit(exception);
    };

    deleteException = (exception: ExceptionWorkingHours) => {
        this.removed.emit(exception);
    };
}
