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

import { RoomService } from '../rooms/room.service';

import type { ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';
@Component({
    templateUrl: './exceptionList.component.html',
    selector: 'exception-list',
})
export class ExceptionListComponent {
    @Input() room!: ExamRoom;
    @Input() hideButton = false;
    @Input() hideTitle = false;
    @Input() filter: (exception: ExceptionWorkingHours) => boolean = () => false;
    @Output() onCreate = new EventEmitter<ExceptionWorkingHours>();
    @Output() onDelete = new EventEmitter<ExceptionWorkingHours>();

    constructor(private roomService: RoomService) {}

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
        this.onCreate.emit(exception);
    };

    deleteException = (exception: ExceptionWorkingHours) => {
        this.onDelete.emit(exception);
    };
}
