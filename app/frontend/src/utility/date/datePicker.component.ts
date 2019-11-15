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
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgbDate } from '@ng-bootstrap/ng-bootstrap';
import * as moment from 'moment';

@Component({
    selector: 'date-picker',
    template: require('./datePicker.component.html'),
})
export class DatePickerComponent implements OnInit {
    @Input() initialDate: Date | string | null = null;
    @Input() extra: boolean;
    @Input() extraText: string;
    @Input() modelOptions: any = {};
    @Input() disabled: boolean;
    @Input() optional: boolean;

    @Output() onUpdate = new EventEmitter<{ date: Date | null }>();
    @Output() onExtraAction = new EventEmitter<{ date: Date | null }>();

    date: NgbDate;
    showWeeks = true;
    format = 'dd.MM.yyyy';

    ngOnInit() {
        if (this.initialDate !== null) {
            const d = moment(this.initialDate);
            this.date = new NgbDate(d.get('year'), d.get('month'), d.get('date'));
        }
    }

    transform(value: NgbDate): Date {
        return new Date(value.year, value.month, value.day);
    }

    dateChanged() {
        this.onUpdate.emit({ date: this.transform(this.date) });
    }

    extraClicked() {
        this.onExtraAction.emit({ date: this.transform(this.date) });
    }
}
