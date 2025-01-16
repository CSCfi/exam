// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { FileService } from 'src/app/shared/file/file.service';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';

@Component({
    template: `
        <div class="row">
            <strong class="col-12">
                {{ 'i18n_get_all_reservations_from_room' | translate }}
            </strong>
        </div>
        <div class="row mb-2 align-items-end">
            <div class="col-3">
                <label for="roomPick">{{ 'i18n_select_room' | translate }}</label>
                @if (rooms) {
                    <xm-dropdown-select
                        id="roomPick"
                        [options]="rooms"
                        (optionSelected)="roomSelected($event)"
                        placeholder="{{ 'i18n_select' | translate }}"
                    ></xm-dropdown-select>
                }
            </div>
            <div class="col-3">
                <label for="startAt">{{ 'i18n_start_time' | translate }}</label>
                <div id="startAt">
                    <xm-date-picker (updated)="startDateChanged($event)"></xm-date-picker>
                </div>
            </div>
            <div class="col-3">
                <label for="endAt">{{ 'i18n_end_time' | translate }}</label>
                <div id="endAt">
                    <xm-date-picker (updated)="endDateChanged($event)"></xm-date-picker>
                </div>
            </div>
            <div class="col-3">
                <button class="btn btn-success btn-sm float-end" (click)="getRoomReservationsByDate()">
                    <i class="bi-file-earmark-excel text-white pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </div>
    `,
    selector: 'xm-rooms-report',
    standalone: true,
    imports: [DropdownSelectComponent, DatePickerComponent, TranslateModule],
})
export class RoomsReportComponent {
    @Input() rooms: Option<ExamRoom, number>[] = [];

    room?: number;
    startDate: Date | null = null;
    endDate: Date | null = null;

    constructor(
        private translate: TranslateService,
        private toast: ToastrService,
        private files: FileService,
    ) {}

    roomSelected = (event?: Option<ExamRoom, number>) => {
        this.room = event?.id;
    };

    getRoomReservationsByDate = () => {
        const f = format(this.startDate || new Date(), 'dd.MM.yyyy');
        const t = format(this.endDate || new Date(), 'dd.MM.yyyy');
        if (this.room) {
            this.files.download(`/app/statistics/resbydate/${this.room}/${f}/${t}`, `reservations_${f}_${t}.xlsx`);
        } else {
            this.toast.error(this.translate.instant('i18n_choose_room'));
        }
    };

    startDateChanged = (event: { date: Date | null }) => {
        this.startDate = event.date;
    };

    endDateChanged = (event: { date: Date | null }) => {
        this.endDate = event.date;
    };
}
