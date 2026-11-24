// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, computed, inject, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { RoomService } from 'src/app/facility/rooms/room.service';
import type { ExceptionWorkingHours } from 'src/app/reservation/reservation.model';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FilterByPipe } from 'src/app/shared/filter/filter-by.pipe';
import { ExceptionDeleteDialogComponent } from './exception-delete-dialog.component';

@Component({
    selector: 'xm-exceptions',
    template: `
        @if (!hideTitle()) {
            <div class="header-text">
                <strong>{{ 'i18n_exception_datetimes' | translate }}:</strong>
            </div>
        }
        @if (!hideInfo()) {
            <div class="header-text">{{ 'i18n_exception_datetimes_info' | translate }}</div>
        }

        @for (exception of orderedExceptions() | filterBy: filter(); track exception; let i = $index) {
            <div class="exception" [class]="i % 2 === 0 ? 'background-light-blue' : ''">
                <div>
                    {{ formatDate(exception) }}
                </div>
                <div>
                    {{ !exception.outOfService ? ('i18n_room_in_service' | translate) : '' }}
                    {{ exception.outOfService ? ('i18n_room_out_of_service' | translate) : '' }}
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-danger pointer" (click)="deleteException(exception)">
                        {{ 'i18n_exam_remove' | translate }}
                    </button>
                </div>
            </div>
        }
        @if (!hideButton()) {
            <div class="xm-cluster add-exception">
                <button (click)="addExceptionClosed()" class="btn btn-sm btn-outline-dark">
                    {{ 'i18n_add_out_of_service_time' | translate }}
                </button>
                <button (click)="addExceptionOpen()" class="btn btn-sm btn-outline-success">
                    {{ 'i18n_add_extra_working_hour' | translate }}
                </button>
            </div>
        }
    `,
    styles: `
        /* Time, status and remove button: the col / col / col-3 split of the row */
        .exception {
            display: grid;
            grid-template-columns: minmax(0, 3fr) minmax(0, 3fr) minmax(0, 2fr);
            column-gap: 1.5rem;
            margin-bottom: var(--xm-space-2);
        }
        .add-exception {
            margin-block: var(--xm-space-2);
        }
    `,
    imports: [TranslateModule, FilterByPipe],
})
export class ExceptionListComponent {
    readonly exceptions = input<ExceptionWorkingHours[]>([]);
    readonly hideButton = input(false);
    readonly hideTitle = input(false);
    readonly hideInfo = input(true);
    readonly filter = input<(exception: ExceptionWorkingHours) => boolean>(() => true);
    /** The room's zone: exception times are shown and entered in room time. */
    readonly timeZone = input<string>();
    readonly created = output<ExceptionWorkingHours[]>();
    readonly removed = output<ExceptionWorkingHours>();

    readonly orderedExceptions = computed(() =>
        this.exceptions()
            .filter((e) => new Date(e.endDate) > new Date())
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    );

    private readonly roomService = inject(RoomService);
    private readonly modal = inject(ModalService);

    formatDate(exception: ExceptionWorkingHours) {
        if (!exception.startDate || !exception.endDate) {
            return;
        }
        const fmt = 'dd.MM.yyyy HH:mm';
        const start = DateTime.fromISO(exception.startDate, { zone: this.timeZone() });
        const end = DateTime.fromISO(exception.endDate, { zone: this.timeZone() });
        return (
            start.toFormat(fmt) +
            ' - ' +
            (start.toFormat('dd.MM.yyyy') === end.toFormat('dd.MM.yyyy') ? end.toFormat('HH:mm') : end.toFormat(fmt))
        );
    }

    addExceptionClosed = () =>
        this.roomService.openExceptionDialog(
            (exceptions) => this.created.emit(exceptions),
            true,
            this.exceptions(),
            this.timeZone(),
        );
    addExceptionOpen = () =>
        this.roomService.openExceptionDialog(
            (exceptions) => this.created.emit(exceptions),
            false,
            this.exceptions(),
            this.timeZone(),
        );

    deleteException(exception: ExceptionWorkingHours) {
        const modal = this.modal.openRef(ExceptionDeleteDialogComponent, { size: 'lg' });
        modal.componentInstance.message.set(this.formatDate(exception));
        modal.componentInstance.exception.set(exception);
        this.modal.result$<void>(modal).subscribe(() => {
            this.removed.emit(exception);
        });
    }
}
