// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, input, linkedSignal, signal } from '@angular/core';
import { FormField, form, max, min } from '@angular/forms/signals';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { WorkingHour } from 'src/app/facility/facility.model';
import { RoomService } from 'src/app/facility/rooms/room.service';

@Component({
    selector: 'xm-starting-time',
    template: `<div class="xm-stack xm-gap-2">
        <div class="header-text">
            <strong>{{ 'i18n_exam_starting_hours' | translate }}:</strong>
        </div>
        <form>
            <div class="offset-row">
                <label class="col-form-label" for="hourOffset">{{ 'i18n_minutes_on_the_hour' | translate }}:</label>
                <div>
                    <input
                        class="form-control"
                        id="hourOffset"
                        type="number"
                        lang="en"
                        [formField]="hourOffsetForm.hourOffset"
                        (change)="onHourOffsetChange()"
                        (click)="setUnsavedProgress(true)"
                    />
                </div>
            </div>
        </form>
        <div class="xm-cluster">
            @for (hour of examStartingHours(); track hour) {
                <span
                    class="badge pointer"
                    [class.xm-bg-success]="hour.selected"
                    [class.bg-secondary]="!hour.selected"
                    (click)="toggleHourSelected(hour)"
                    >{{ hour.startingHour }}</span
                >
            }
        </div>
        <div class="starting-actions">
            <div>
                <button
                    class="btn btn-sm btn-outline-dark"
                    (click)="updateStartingHours()"
                    [disabled]="!anyStartingHoursSelected()"
                >
                    {{ 'i18n_save' | translate }}
                </button>
                <i
                    class="bi-exclamation-triangle-fill xm-text-warning ms-3"
                    triggers="mouseenter:mouseleave"
                    ngbPopover="{{ 'i18n_unsaved_changes' | translate }}"
                    [hidden]="!unsavedProgress()"
                ></i>
            </div>
            <button class="btn btn-outline-dark" (click)="toggleAllExamStartingHours()">
                {{ 'i18n_add_remove_all' | translate }}
            </button>
        </div>
    </div>`,
    styles: `
        @use '../../shared/grid';

        /* Label in half the row, the minutes field in the next 2/12 */
        .offset-row {
            display: grid;
            grid-template-columns: minmax(0, 6fr) minmax(0, 2fr) minmax(0, 4fr);
            column-gap: grid.$gutter;
        }
        /* Save (and the unsaved-changes warning) at the start, select-all at the end */
        .starting-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            gap: var(--xm-space-2);
        }
    `,
    imports: [FormField, TranslateModule, NgbPopover],
})
export class StartingTimeComponent {
    readonly roomIds = input<number[]>([]);
    readonly startingHours = input<WorkingHour[]>([]);

    readonly examStartingHourOffset = linkedSignal<number>(() => {
        const hours = this.startingHours();
        if (!hours || hours.length === 0) return 0;
        return parseInt(hours[0].startingHour.split(':')[1]);
    });
    readonly examStartingHours = linkedSignal<WorkingHour[]>(() => {
        const hours = this.startingHours();
        const initialHours = [...Array(24)].map((_, i) => ({ startingHour: `${i}:00`, selected: true }));
        if (!hours || hours.length === 0) return initialHours;
        const offset = parseInt(hours[0].startingHour.split(':')[1]);
        return initialHours.map((hour) => {
            const withOffset = hour.startingHour.split(':')[0] + ':' + this.zeropad(offset);
            return { startingHour: withOffset, selected: hours.some((h) => h.startingHour === withOffset) };
        });
    });
    readonly unsavedProgress = signal(false);
    readonly hourOffsetForm = form(
        linkedSignal<{ hourOffset: number | null }>(() => ({ hourOffset: this.examStartingHourOffset() })),
        (path) => {
            min(path.hourOffset, 0);
            max(path.hourOffset, 59);
        },
    );

    private readonly Room = inject(RoomService);

    updateStartingHours() {
        this.Room.updateStartingHours$(this.examStartingHours(), this.roomIds()).subscribe({
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

    onHourOffsetChange() {
        const value = this.hourOffsetForm.hourOffset().value();
        this.setExamStartingHourOffset(value ?? 0);
        this.setStartingHourOffset();
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
