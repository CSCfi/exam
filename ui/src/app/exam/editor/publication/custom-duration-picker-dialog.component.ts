// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Duration } from 'luxon';

@Component({
    imports: [FormsModule, TranslateModule],
    template: `
        <div class="modal-header">
            <div class="xm-modal-title">
                {{ 'i18n_custom' | translate }} {{ ('i18n_exam_time' | translate).toLowerCase() }}
            </div>
        </div>
        <div class="modal-body">
            <div class="row">
                <div class="col-md-12">
                    ({{ 'i18n_between' | translate }}: {{ format(minDuration()) }} - {{ format(maxDuration()) }})
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-6">
                    <label class="form-label" for="hourValue">{{ 'i18n_hours' | translate }}</label>
                    <input
                        id="hourValue"
                        class="form-control xm-numeric-input"
                        type="number"
                        [ngModel]="hours()"
                        (ngModelChange)="hours.set($event)"
                        [max]="maxHour()"
                        [min]="0"
                    />
                </div>
                <div class="col-6">
                    <label class="form-label" for="minuteValue">{{ 'i18n_minutes' | translate }}</label>
                    <input
                        id="minuteValue"
                        class="form-control xm-numeric-input"
                        type="number"
                        [ngModel]="minutes()"
                        (ngModelChange)="minutes.set($event)"
                        [max]="59"
                        [min]="0"
                    />
                </div>
            </div>
        </div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button
                class="btn btn-success"
                (click)="activeModal.close({ hours: this.hours(), minutes: this.minutes() })"
                [disabled]="!allowSaving()"
                autofocus
            >
                {{ 'i18n_button_ok' | translate }}
            </button>
            <button class="btn btn-outline-secondary me-3" (click)="activeModal.dismiss()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
})
export class CustomDurationPickerDialogComponent implements OnInit {
    hours = signal(0);
    minutes = signal(0);
    minDuration = signal(1);
    maxDuration = signal(300);
    maxHour = computed(() => this.maxDuration() / 60);

    constructor(
        public activeModal: NgbActiveModal,
        private http: HttpClient,
    ) {}

    ngOnInit() {
        this.http
            .get<{ maxDuration: number }>('/app/settings/maxDuration')
            .subscribe((data) => this.maxDuration.set(data.maxDuration));
        this.http
            .get<{ minDuration: number }>('/app/settings/minDuration')
            .subscribe((data) => this.minDuration.set(data.minDuration));
    }

    format = (minutes: number): string => Duration.fromObject({ minutes: minutes }).toFormat('hh:mm');
    allowSaving = () => {
        const duration = this.hours() * 60 + this.minutes();
        return duration <= this.maxDuration() && duration >= this.minDuration();
    };
}
