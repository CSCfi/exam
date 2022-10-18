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
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { format, parseISO } from 'date-fns';
import type { ExceptionWorkingHours } from '../../reservation/reservation.model';
import { RoomService } from '../rooms/room.service';

@Component({
    selector: 'xm-exceptions',
    template: `
        <div class="row" *ngIf="!hideTitle">
            <div class="col-md-12 header-text">
                <strong>{{ 'sitnet_exception_datetimes' | translate }}:</strong>
            </div>
        </div>
        <div class="row" *ngIf="!hideInfo">
            <div class="col-md-12 header-text">{{ 'sitnet_exception_datetimes_info' | translate }}</div>
        </div>

        <div class="row" *ngFor="let exception of orderedExceptions | filterBy: filter; let i = index">
            <div class="col-3">
                {{ formatDate(exception) }}
            </div>
            <div class="col-3">
                {{ !exception.outOfService ? ('sitnet_room_in_service' | translate) : '' }}
                {{ exception.outOfService ? ('sitnet_room_out_of_service' | translate) : '' }}
            </div>
            <div class="col">
                <a class="pointer" (click)="deleteException(exception)">{{ 'sitnet_exam_remove' | translate }}</a>
            </div>
        </div>
        <div class="row mt-2" *ngIf="!hideButton">
            <div class="col-12">
                <button (click)="addException()" class="btn btn-sm btn-outline-dark">
                    {{ 'sitnet_add' | translate }}
                </button>
            </div>
        </div>
    `,
})
export class ExceptionListComponent implements OnInit, OnChanges {
    @Input() exceptions: ExceptionWorkingHours[] = [];
    @Input() hideButton = false;
    @Input() hideTitle = false;
    @Input() hideInfo = true;
    @Input() filter: (exception: ExceptionWorkingHours) => boolean;
    @Output() created = new EventEmitter<ExceptionWorkingHours[]>();
    @Output() removed = new EventEmitter<ExceptionWorkingHours>();

    orderedExceptions: ExceptionWorkingHours[] = [];

    constructor(private roomService: RoomService) {
        this.filter = () => true;
    }

    ngOnInit() {
        this.init();
    }

    ngOnChanges() {
        this.init();
    }

    formatDate = (exception: ExceptionWorkingHours) => {
        if (!exception.startDate || !exception.endDate) {
            return;
        }
        const fmt = 'dd.MM.yyyy HH:mm';
        const start = parseISO(exception.startDate);
        const end = parseISO(exception.endDate);
        return (
            format(start, fmt) +
            ' - ' +
            (format(start, 'dd.MM.yyyy') === format(end, 'dd.MM.yyyy') ? format(end, 'HH:mm') : format(end, fmt))
        );
    };

    addException = () => this.roomService.openExceptionDialog(this.createExceptionCallback);

    createExceptionCallback = (exception: ExceptionWorkingHours[]) => this.created.emit(exception);

    deleteException = (exception: ExceptionWorkingHours) => this.removed.emit(exception);

    private init = () =>
        (this.orderedExceptions = this.exceptions
            .filter((e) => new Date(e.endDate) > new Date())
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
}
