import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import type { MaintenancePeriod } from '../../exam/exam.model';

@Component({
    templateUrl: './maintenancePeriodDialog.component.html',
})
export class MaintenancePeriodDialogComponent {
    @Input() period?: MaintenancePeriod;
    dateOptions = {
        'starting-day': 1,
    };
    dateFormat = 'dd.MM.yyyy';
    startsAt = new Date();
    endsAt = new Date();
    description = '';

    constructor(private translate: TranslateService, private activeModal: NgbActiveModal) {}

    ngOnInit() {
        if (this.period) {
            this.startsAt = new Date(this.period.startsAt);
            this.endsAt = new Date(this.period.endsAt);
            this.description = this.period.description;
        }
    }

    ok = () => {
        if (this.endsAt <= this.startsAt) {
            toast.error(this.translate.instant('sitnet_endtime_before_starttime'));
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
    };

    onEndDateChange = (e: { date: Date }) => {
        this.endsAt = e.date;
    };
}
