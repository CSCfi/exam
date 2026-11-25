// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, linkedSignal, model } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaintenancePeriod } from 'src/app/facility/facility.model';
import { DateTimePickerComponent } from 'src/app/shared/date/date-time-picker.component';
import { ToastService } from 'src/app/shared/toast/toast.service';

@Component({
    styles: `
        @use '../../shared/grid';

        /* Begin and end side by side */
        .dates {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            column-gap: grid.$gutter;
        }
    `,
    imports: [FormField, TranslateModule, DateTimePickerComponent],
    template: `
        <div class="modal-header">
            <h4><i class="fa fa-exclamation"></i>&nbsp;&nbsp;{{ 'i18n_maintenance_period' | translate }}</h4>
        </div>

        <div class="modal-body">
            <form class="xm-stack xm-gap-2">
                <div>
                    <label for="description" class="form-label">{{ 'i18n_description' | translate }}:</label>
                    <input class="form-control" id="description" [formField]="descriptionForm.description" />
                </div>
                <div class="dates">
                    <div>
                        <label for="startDate">{{ 'i18n_begin' | translate }}:</label>
                        <xm-date-time-picker
                            id="startDate"
                            [initialTime]="startsAt()"
                            [hourStep]="1"
                            [minuteStep]="15"
                            (updated)="onStartDateChange($event)"
                        >
                        </xm-date-time-picker>
                    </div>
                    <div>
                        <label for="endDate">{{ 'i18n_end' | translate }}:</label>
                        <xm-date-time-picker
                            id="endDate"
                            [initialTime]="endsAt()"
                            [hourStep]="1"
                            [minuteStep]="15"
                            (updated)="onEndDateChange($event)"
                        >
                        </xm-date-time-picker>
                    </div>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline-secondary" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
            <button class="btn btn-success" [disabled]="descriptionForm.description().invalid()" (click)="ok()">
                {{ 'i18n_button_save' | translate }}
            </button>
        </div>
    `,
})
export class MaintenancePeriodDialogComponent {
    readonly period = model<MaintenancePeriod | undefined>(undefined);
    readonly startsAt = linkedSignal(() =>
        this.period() ? new Date(this.period()!.startsAt) : new Date(new Date().setMinutes(60)),
    );
    readonly endsAt = linkedSignal(() =>
        this.period() ? new Date(this.period()!.endsAt) : new Date(new Date().setMinutes(60)),
    );
    readonly descriptionForm = form(
        linkedSignal(() => ({ description: this.period()?.description ?? '' })),
        (path) => {
            required(path.description);
        },
    );

    private readonly translate = inject(TranslateService);
    private readonly activeModal = inject(NgbActiveModal);
    private readonly toast = inject(ToastService);

    ok() {
        if (this.endsAt() <= this.startsAt()) {
            this.toast.error(this.translate.instant('i18n_endtime_before_starttime'));
            return;
        }
        this.activeModal.close({
            id: this.period()?.id,
            startsAt: this.startsAt().toISOString(),
            endsAt: this.endsAt().toISOString(),
            description: this.descriptionForm.description().value(),
        });
    }

    cancel() {
        this.activeModal.dismiss();
    }

    onStartDateChange(e: { date: Date }) {
        this.startsAt.set(e.date);
        if (this.endsAt() < this.startsAt()) {
            this.endsAt.set(e.date);
        }
    }

    onEndDateChange(e: { date: Date }) {
        this.endsAt.set(e.date);
    }
}
