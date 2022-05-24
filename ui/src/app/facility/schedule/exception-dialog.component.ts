import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { cloneDeep } from 'lodash';
import { ToastrService } from 'ngx-toastr';

@Component({
    template: `<div id="sitnet-dialog">
        <div class="modal-header">
            <h4><i class="fa fa-exclamation"></i>&nbsp;&nbsp;{{ 'sitnet_exception_time' | translate }}</h4>
        </div>

        <div class="modal-body" *ngIf="exception">
            <div class="row">
                <div class="col">
                    <div class="form-check">
                        <label>
                            <input
                                class="form-check-input"
                                type="checkbox"
                                [checked]="exception.outOfService"
                                (change)="exception.outOfService = !exception.outOfService"
                            />
                            {{ 'sitnet_room_out_of_service' | translate }}
                        </label>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <label for="startDate">{{ 'sitnet_begin' | translate }}:</label>
                    <xm-date-time-picker
                        id="startDate"
                        [initialTime]="exception.startDate"
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
                        [initialTime]="exception.endDate"
                        [hourStep]="1"
                        [minuteStep]="15"
                        (updated)="onEndDateChange($event)"
                    >
                    </xm-date-time-picker>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-danger float-end" (click)="cancel()">
                {{ 'sitnet_button_cancel' | translate }}
            </button>
            <button class="btn btn-primary" (click)="ok()">
                {{ 'sitnet_button_save' | translate }}
            </button>
        </div>
    </div> `,
})
export class ExceptionDialogComponent {
    dateOptions = {
        'starting-day': 1,
    };
    dateFormat = 'dd.MM.yyyy';
    exception: {
        startDate: Date;
        endDate: Date;
        outOfService: boolean;
    };

    constructor(
        private translate: TranslateService,
        private activeModal: NgbActiveModal,
        private toast: ToastrService,
    ) {
        const now = new Date();
        now.setSeconds(0);
        now.setMilliseconds(0);
        this.exception = {
            startDate: now,
            endDate: cloneDeep(now),
            outOfService: true,
        };
    }

    ok = () => {
        const start = this.exception.startDate;
        const end = this.exception.endDate;
        if (end <= start) {
            this.toast.error(this.translate.instant('sitnet_endtime_before_starttime'));
            return;
        }
        this.activeModal.close({
            startDate: start,
            endDate: end,
            outOfService: this.exception.outOfService,
        });
    };

    cancel = () => {
        this.activeModal.dismiss();
    };

    onStartDateChange = (e: { date: Date }) => {
        this.exception.startDate = e.date;
    };

    onEndDateChange = (e: { date: Date }) => {
        this.exception.endDate = e.date;
    };
}
