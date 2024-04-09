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
import { NgClass } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { format, parseISO } from 'date-fns';
import type { WorkingHour } from '../rooms/room.service';
import { RoomService } from '../rooms/room.service';

@Component({
    selector: 'xm-starting-time',
    template: `<div class="row">
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
                        (click)="hour.selected = !hour.selected"
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
            </div>
            <div class="col-6">
                <button class="btn btn-outline-dark float-end" (click)="toggleAllExamStartingHours()">
                    {{ 'i18n_add_remove_all' | translate }}
                </button>
            </div>
        </div>`,
    standalone: true,
    imports: [FormsModule, NgClass, TranslateModule],
})
export class StartingTimeComponent implements OnInit {
    @Input() roomIds: number[] = [];
    @Input() startingHours: WorkingHour[] = [];

    examStartingHours: WorkingHour[] = [];
    examStartingHourOffset = 0;

    constructor(private Room: RoomService) {}

    ngOnInit() {
        this.examStartingHours = [...Array(24)].map(function (x, i) {
            return { startingHour: i + ':00', selected: true };
        });
        if (this.startingHours && this.startingHours.length > 0) {
            const startingHourDates = this.startingHours.map((hour) => parseISO(hour.startingHour));

            this.examStartingHourOffset = startingHourDates[0].getMinutes();
            const startingHours = startingHourDates.map((hour) => format(hour, 'H:mm'));

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
