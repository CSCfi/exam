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
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { format, parseISO } from 'date-fns';
import { from } from 'rxjs';
import type { ExceptionWorkingHours } from '../../reservation/reservation.model';
import { FilterByPipe } from '../../shared/filter/filter-by.pipe';
import { RoomService } from '../rooms/room.service';
import { ExceptionDeleteDialogComponent } from './exception-delete-dialog.component';

@Component({
    selector: 'xm-exceptions',
    template: `
        @if (!hideTitle) {
            <div class="row">
                <div class="col-md-12 header-text">
                    <strong>{{ 'i18n_exception_datetimes' | translate }}:</strong>
                </div>
            </div>
        }
        @if (!hideInfo) {
            <div class="row">
                <div class="col-md-12 header-text">{{ 'i18n_exception_datetimes_info' | translate }}</div>
            </div>
        }

        @for (exception of orderedExceptions | filterBy: filter; track exception; let i = $index) {
            <div class="row" [class]="i % 2 === 0 ? 'background-light-blue' : ''">
                <div class="col">
                    {{ formatDate(exception) }}
                </div>
                <div class="col">
                    {{ !exception.outOfService ? ('i18n_room_in_service' | translate) : '' }}
                    {{ exception.outOfService ? ('i18n_room_out_of_service' | translate) : '' }}
                </div>
                <div class="col-3">
                    <a class="pointer" (click)="deleteException(exception)">{{ 'i18n_exam_remove' | translate }}</a>
                </div>
            </div>
        }
        @if (!hideButton) {
            <div class="row mt-2">
                <div class="col-12">
                    <button (click)="addExceptionClosed()" class="btn btn-sm btn-outline-dark me-2 mb-2">
                        {{ 'i18n_add_out_of_service_time' | translate }}
                    </button>
                    <button (click)="addExceptionOpen()" class="btn btn-sm btn-outline-success mb-2">
                        {{ 'i18n_add_extra_working_hour' | translate }}
                    </button>
                </div>
            </div>
        }
    `,
    standalone: true,
    imports: [TranslateModule, FilterByPipe],
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

    constructor(
        private roomService: RoomService,
        private modal: NgbModal,
    ) {
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

    addExceptionClosed = () =>
        this.roomService.openExceptionDialog(this.createExceptionCallback, true, this.exceptions);
    addExceptionOpen = () => this.roomService.openExceptionDialog(this.createExceptionCallback, false, this.exceptions);

    createExceptionCallback = (exceptions: ExceptionWorkingHours[]) => this.created.emit(exceptions);

    deleteException = (exception: ExceptionWorkingHours) => {
        const modal = this.modal.open(ExceptionDeleteDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modal.componentInstance.message = this.formatDate(exception);
        modal.componentInstance.exception = exception;
        from(modal.result).subscribe({
            next: () => {
                this.exceptions.splice(this.exceptions.indexOf(exception), 1);
                this.init();
                this.removed.emit(exception);
            },
        });
    };

    private init = () =>
        (this.orderedExceptions = this.exceptions
            .filter((e) => new Date(e.endDate) > new Date())
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
}
