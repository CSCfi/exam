// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { MaintenancePeriod } from 'src/app/facility/facility.model';
import { DateTimePickerComponent } from 'src/app/shared/date/date-time-picker.component';

@Component({
    imports: [FormsModule, TranslateModule, DateTimePickerComponent],
    template: `
        <div class="modal-header">
            <h4><i class="fa fa-exclamation"></i>&nbsp;&nbsp;{{ 'i18n_maintenance_period' | translate }}</h4>
        </div>

        <div class="modal-body">
            <form #periodForm="ngForm" name="periodForm">
                <div class="row">
                    <div class="col-md-12 mb-2">
                        <label for="description" class="form-label">{{ 'i18n_description' | translate }}:</label>
                        <input
                            class="form-control"
                            id="description"
                            name="description"
                            [ngModel]="description()"
                            (ngModelChange)="setDescription($event)"
                            required
                        />
                    </div>
                </div>
                <div class="row">
                    <div class="col">
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
                    <div class="col">
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
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-success" [disabled]="periodForm.invalid" (click)="ok()">
                {{ 'i18n_button_save' | translate }}
            </button>
            <button class="btn btn-outline-secondary float-end me-3" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenancePeriodDialogComponent {
    period = input<MaintenancePeriod | undefined>(undefined);
    readonly DATE_OPTIONS = {
        'starting-day': 1,
    };
    readonly DATE_FORMAT = 'dd.MM.yyyy';
    startsAt = signal(new Date(new Date().setMinutes(60)));
    endsAt = signal(new Date(new Date().setMinutes(60)));
    description = signal('');

    private translate = inject(TranslateService);
    private activeModal = inject(NgbActiveModal);
    private toast = inject(ToastrService);

    constructor() {
        effect(() => {
            const currentPeriod = this.period();
            if (currentPeriod) {
                this.startsAt.set(new Date(currentPeriod.startsAt));
                this.endsAt.set(new Date(currentPeriod.endsAt));
                this.description.set(currentPeriod.description);
            }
        });
    }

    ok() {
        if (this.endsAt() <= this.startsAt()) {
            this.toast.error(this.translate.instant('i18n_endtime_before_starttime'));
            return;
        }
        this.activeModal.close({
            id: this.period()?.id,
            startsAt: this.startsAt(),
            endsAt: this.endsAt(),
            description: this.description(),
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

    setDescription(value: string) {
        this.description.set(value);
    }
}
