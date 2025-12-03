// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { WorkingHour } from 'src/app/facility/facility.model';
import { RoomService } from 'src/app/facility/rooms/room.service';

@Component({
    selector: 'xm-starting-time',
    template: ` <div class="row">
            <div class="col-md-12 header-text">
                <strong>{{ 'i18n_exam_starting_hours' | translate }}:</strong>
            </div>
        </div>
        <div class="row">
            <div class="col-md-12">
                <form>
                    <div class="row">
                        <label class="col-6 col-form-label" for="hourOffset"
                            >{{ 'i18n_minutes_on_the_hour' | translate }}:</label
                        >
                        <div class="col-2">
                            <input
                                class="form-control"
                                id="hourOffset"
                                name="hourOffset"
                                type="number"
                                lang="en"
                                [min]="0"
                                [max]="59"
                                [(ngModel)]="examStartingHourOffset"
                                (change)="setStartingHourOffset()"
                                (click)="unsavedProgress = true"
                            />
                        </div>
                    </div>
                </form>
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-12">
                @for (hour of examStartingHours; track hour) {
                    <span
                        class="badge pointer"
                        [ngClass]="hour.selected ? 'bg-success' : 'bg-secondary'"
                        (click)="hour.selected = !hour.selected; unsavedProgress = true"
                        style="margin: 0.2em"
                        >{{ hour.startingHour }}</span
                    >
                }
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-6">
                <button
                    class="btn btn-sm btn-outline-dark"
                    (click)="updateStartingHours(); unsavedProgress = false"
                    [disabled]="!anyStartingHoursSelected()"
                >
                    {{ 'i18n_save' | translate }}
                </button>
                <i
                    class="bi-exclamation-triangle-fill text-warning ms-3"
                    triggers="mouseenter:mouseleave"
                    ngbPopover="{{ 'i18n_unsaved_changes' | translate }}"
                    [hidden]="!unsavedProgress"
                ></i>
            </div>
            <div class="col-6">
                <button
                    class="btn btn-outline-dark float-end"
                    (click)="toggleAllExamStartingHours(); unsavedProgress = true"
                >
                    {{ 'i18n_add_remove_all' | translate }}
                </button>
            </div>
        </div>`,
    imports: [FormsModule, NgClass, TranslateModule, NgbPopover],
})
export class StartingTimeComponent implements OnInit {
    @Input() roomIds: number[] = [];
    @Input() startingHours: WorkingHour[] = [];

    examStartingHours: WorkingHour[] = [];
    examStartingHourOffset = 0;
    unsavedProgress = false;

    private Room = inject(RoomService);

    ngOnInit() {
        this.examStartingHours = [...Array(24)].map(function (x, i) {
            return { startingHour: i + ':00', selected: true };
        });
        if (this.startingHours && this.startingHours.length > 0) {
            const startingHourDates = this.startingHours.map((hour) => DateTime.fromISO(hour.startingHour));

            this.examStartingHourOffset = startingHourDates[0].minute;
            const startingHours = startingHourDates.map((hour) => hour.toFormat('H:mm'));

            this.setStartingHourOffset();
            this.examStartingHours.forEach((hour) => {
                hour.selected = startingHours.indexOf(hour.startingHour) !== -1;
            });
        }
    }

    updateStartingHours = () => {
        this.Room.updateStartingHours(this.examStartingHours, this.examStartingHourOffset, this.roomIds).then(() => {
            if (this.startingHours) {
                this.startingHours = this.examStartingHours;
            }
        });
    };

    toggleAllExamStartingHours = () => {
        const anySelected = this.examStartingHours.some((hours) => {
            return hours.selected;
        });
        this.examStartingHours.forEach((hours) => {
            hours.selected = !anySelected;
        });
    };

    setStartingHourOffset = () => {
        this.examStartingHourOffset = this.examStartingHourOffset || 0;
        this.examStartingHours.forEach((hours) => {
            hours.startingHour = hours.startingHour.split(':')[0] + ':' + this.zeropad(this.examStartingHourOffset);
        });
    };

    anyStartingHoursSelected = () => this.examStartingHours.some((hours) => hours.selected);

    private zeropad = (n: number) => (String(n).length > 1 ? n : '0' + n);
}
