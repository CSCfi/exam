import { Component } from '@angular/core';
import * as moment from 'moment';
import * as toast from 'toastr';
import { cloneDeep } from 'lodash';
import { TranslateService } from '@ngx-translate/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    template: require('./exceptionDialog.component.html'),
    selector: 'exception-dialog',
})
export class ExceptionDialogComponent {
    dateOptions = {
        'starting-day': 1,
    };
    dateFormat: 'dd.MM.yyyy';
    exception: {
        startDate: Date;
        endDate: Date;
        outOfService: boolean;
    };

    constructor(private translate: TranslateService, private activeModal: NgbActiveModal) {
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
        const start = moment(this.exception.startDate);
        const end = moment(this.exception.endDate);
        if (end <= start) {
            toast.error(this.translate.instant('sitnet_endtime_before_starttime'));
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
