import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { DateTimePickerComponent } from 'src/app/shared/date/date-time-picker.component';
import type { MaintenancePeriod } from '../../exam/exam.model';

@Component({
    standalone: true,
    imports: [FormsModule, TranslateModule, DateTimePickerComponent],
    template: `<div>
        <div class="modal-header">
            <h4><i class="fa fa-exclamation"></i>&nbsp;&nbsp;{{ 'sitnet_maintenance_period' | translate }}</h4>
        </div>

        <div class="modal-body">
            <form #periodForm="ngForm" name="periodForm">
                <div class="row">
                    <div class="col-md-12 mb-2">
                        <label for="description" class="form-label">{{ 'sitnet_description' | translate }}:</label>
                        <input
                            class="form-control"
                            id="description"
                            name="description"
                            class="form-control"
                            [(ngModel)]="description"
                            required
                        />
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <label for="startDate">{{ 'sitnet_begin' | translate }}:</label>
                        <xm-date-time-picker
                            id="startDate"
                            [initialTime]="startsAt"
                            [hourStep]="1"
                            [minuteStep]="15"
                            (updated)="onStartDateChange($event)"
                        >
                        </xm-date-time-picker>
                    </div>
                    <div class="col">
                        <label for="endDate">{{ 'sitnet_end' | translate }}:</label>
                        <xm-date-time-picker
                            id="endDate"
                            [initialTime]="endsAt"
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
            <button class="btn btn-danger float-end" (click)="cancel()">
                {{ 'sitnet_button_cancel' | translate }}
            </button>
            <button class="btn btn-primary" [disabled]="periodForm.invalid" (click)="ok()">
                {{ 'sitnet_button_save' | translate }}
            </button>
        </div>
    </div> `,
})
export class MaintenancePeriodDialogComponent implements OnInit {
    @Input() period?: MaintenancePeriod;
    dateOptions = {
        'starting-day': 1,
    };
    dateFormat = 'dd.MM.yyyy';
    startsAt = new Date(new Date().setMinutes(60));
    endsAt = new Date(new Date().setMinutes(60));
    description = '';

    constructor(
        private translate: TranslateService,
        private activeModal: NgbActiveModal,
        private toast: ToastrService,
    ) {}

    ngOnInit() {
        if (this.period) {
            this.startsAt = new Date(this.period.startsAt);
            this.endsAt = new Date(this.period.endsAt);
            this.description = this.period.description;
        }
    }

    ok = () => {
        if (this.endsAt <= this.startsAt) {
            this.toast.error(this.translate.instant('sitnet_endtime_before_starttime'));
            return;
        }
        this.activeModal.close({
            id: this.period?.id,
            startsAt: this.startsAt,
            endsAt: this.endsAt,
            description: this.description,
        });
    };

    cancel = () => this.activeModal.dismiss();

    onStartDateChange = (e: { date: Date }) => {
        this.startsAt = e.date;
        if (this.endsAt < this.startsAt) {
            this.endsAt = e.date;
        }
    };

    onEndDateChange = (e: { date: Date }) => {
        this.endsAt = e.date;
    };
}
