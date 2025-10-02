// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, EventEmitter, Input, OnChanges, OnInit, Output, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { from } from 'rxjs';
import { RoomService } from 'src/app/facility/rooms/room.service';
import type { ExceptionWorkingHours } from 'src/app/reservation/reservation.model';
import { FilterByPipe } from 'src/app/shared/filter/filter-by.pipe';
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
                    <button class="btn btn-outline-danger pointer" (click)="deleteException(exception)">
                        {{ 'i18n_exam_remove' | translate }}
                    </button>
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

    private roomService = inject(RoomService);
    private modal = inject(NgbModal);

    constructor() {
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
        const start = DateTime.fromISO(exception.startDate);
        const end = DateTime.fromISO(exception.endDate);
        return (
            start.toFormat(fmt) +
            ' - ' +
            (start.toFormat('dd.MM.yyyy') === end.toFormat('dd.MM.yyyy') ? end.toFormat('HH:mm') : end.toFormat(fmt))
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
