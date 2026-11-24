// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, input, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { FileService } from 'src/app/shared/file/file.service';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';
import { ToastService } from 'src/app/shared/toast/toast.service';

@Component({
    template: `
        <section class="xm-stack xm-gap-2">
            <h2 class="report-title">{{ 'i18n_get_all_reservations_from_room' | translate }}</h2>
            <div class="xm-fields">
                <div>
                    <label for="roomPick">{{ 'i18n_select_room' | translate }}</label>
                    @if (rooms()) {
                        <xm-dropdown-select
                            triggerId="roomPick"
                            [options]="rooms()"
                            (optionSelected)="roomSelected($event)"
                            placeholder="{{ 'i18n_select' | translate }}"
                        ></xm-dropdown-select>
                    }
                </div>
                <div>
                    <label for="rooms-report-start">{{ 'i18n_start_time' | translate }}</label>
                    <xm-date-picker inputId="rooms-report-start" (updated)="startDateChanged($event)"></xm-date-picker>
                </div>
                <div>
                    <label for="rooms-report-end">{{ 'i18n_end_time' | translate }}</label>
                    <xm-date-picker inputId="rooms-report-end" (updated)="endDateChanged($event)"></xm-date-picker>
                </div>
                <button class="btn btn-success btn-sm xm-fields-action" (click)="getRoomReservationsByDate()">
                    <i class="bi-file-earmark-excel text-white pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </section>
    `,
    selector: 'xm-rooms-report',
    styleUrl: './report-category.scss',
    imports: [DropdownSelectComponent, DatePickerComponent, TranslateModule],
})
export class RoomsReportComponent {
    readonly rooms = input<Option<ExamRoom, number>[]>([]);
    readonly room = signal<number | undefined>(undefined);
    readonly startDate = signal<Date | null>(null);
    readonly endDate = signal<Date | null>(null);

    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastService);
    private readonly files = inject(FileService);

    roomSelected(event?: Option<ExamRoom, number>) {
        this.room.set(event?.id);
    }

    getRoomReservationsByDate() {
        const f = DateTime.fromJSDate(this.startDate() || new Date()).toFormat('dd.MM.yyyy');
        const t = DateTime.fromJSDate(this.endDate() || new Date()).toFormat('dd.MM.yyyy');
        const currentRoom = this.room();
        if (currentRoom) {
            this.files.download(`/app/reports/resbydate/${currentRoom}/${f}/${t}`, `reservations_${f}_${t}.xlsx`);
        } else {
            this.toast.error(this.translate.instant('i18n_choose_room'));
        }
    }

    startDateChanged(event: { date: Date | null }) {
        this.startDate.set(event.date);
    }

    endDateChanged(event: { date: Date | null }) {
        this.endDate.set(event.date);
    }
}
