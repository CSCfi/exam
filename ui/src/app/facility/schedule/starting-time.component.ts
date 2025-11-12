// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
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
                                [ngModel]="examStartingHourOffset()"
                                (ngModelChange)="setExamStartingHourOffset($event)"
                                (change)="setStartingHourOffset()"
                                (click)="setUnsavedProgress(true)"
                            />
                        </div>
                    </div>
                </form>
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-12">
                @for (hour of examStartingHours(); track hour) {
                    <span
                        class="badge pointer"
                        [ngClass]="hour.selected ? 'bg-success' : 'bg-secondary'"
                        (click)="toggleHourSelected(hour)"
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
                    (click)="updateStartingHours()"
                    [disabled]="!anyStartingHoursSelected()"
                >
                    {{ 'i18n_save' | translate }}
                </button>
                <i
                    class="bi-exclamation-triangle-fill text-warning ms-3"
                    triggers="mouseenter:mouseleave"
                    ngbPopover="{{ 'i18n_unsaved_changes' | translate }}"
                    [hidden]="!unsavedProgress()"
                ></i>
            </div>
            <div class="col-6">
                <button class="btn btn-outline-dark float-end" (click)="toggleAllExamStartingHours()">
                    {{ 'i18n_add_remove_all' | translate }}
                </button>
            </div>
        </div>`,
    imports: [FormsModule, NgClass, TranslateModule, NgbPopover],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartingTimeComponent {
    roomIds = input<number[]>([]);
    startingHours = input<WorkingHour[]>([]);

    examStartingHours = signal<WorkingHour[]>([]);
    examStartingHourOffset = signal(0);
    unsavedProgress = signal(false);

    private Room = inject(RoomService);

    constructor() {
        effect(() => {
            const hours = this.startingHours();
            const initialHours = [...Array(24)].map(function (_, i) {
                return { startingHour: i + ':00', selected: true };
            });

            if (hours && hours.length > 0) {
                const startingHourDates = hours.map((hour) => DateTime.fromISO(hour.startingHour));
                const offset = startingHourDates[0].minute;
                this.examStartingHourOffset.set(offset);
                const formattedStartingHours = startingHourDates.map((hour) => hour.toFormat('H:mm'));

                // First update the hour format with offset
                const hoursWithOffset = initialHours.map((hour) => ({
                    ...hour,
                    startingHour: hour.startingHour.split(':')[0] + ':' + this.zeropad(offset),
                }));

                // Then check which ones are selected by comparing formatted times
                const updatedHours = hoursWithOffset.map((hour) => ({
                    ...hour,
                    selected: formattedStartingHours.indexOf(hour.startingHour) !== -1,
                }));
                this.examStartingHours.set(updatedHours);
            } else {
                this.examStartingHours.set(initialHours);
            }
        });
    }

    updateStartingHours() {
        this.Room.updateStartingHours$(
            this.examStartingHours(),
            this.examStartingHourOffset(),
            this.roomIds(),
        ).subscribe({
            next: () => {
                this.unsavedProgress.set(false);
            },
        });
    }

    toggleAllExamStartingHours() {
        const currentHours = this.examStartingHours();
        const anySelected = currentHours.some((hours) => hours.selected);
        this.examStartingHours.set(currentHours.map((hours) => ({ ...hours, selected: !anySelected })));
        this.unsavedProgress.set(true);
    }

    setStartingHourOffset() {
        const offset = this.examStartingHourOffset() || 0;
        this.examStartingHours.update((hours) =>
            hours.map((hour) => ({
                ...hour,
                startingHour: hour.startingHour.split(':')[0] + ':' + this.zeropad(offset),
            })),
        );
    }

    setExamStartingHourOffset(value: number) {
        this.examStartingHourOffset.set(value);
    }

    toggleHourSelected(hour: WorkingHour) {
        this.examStartingHours.update((hours) => hours.map((h) => (h === hour ? { ...h, selected: !h.selected } : h)));
        this.unsavedProgress.set(true);
    }

    anyStartingHoursSelected() {
        return this.examStartingHours().some((hours) => hours.selected);
    }

    setUnsavedProgress(value: boolean) {
        this.unsavedProgress.set(value);
    }

    private zeropad(n: number) {
        return String(n).length > 1 ? n : '0' + n;
    }
}
