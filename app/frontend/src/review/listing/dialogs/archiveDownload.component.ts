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
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import * as toast from 'toastr';

@Component({
    selector: 'archive-download',
    templateUrl: './archiveDownload.component.html',
})
export class ArchiveDownloadComponent {
    params: { startDate: Date; endDate: Date };
    constructor(private modal: NgbActiveModal, private translate: TranslateService) {}

    ngOnInit() {
        this.params = { startDate: new Date(), endDate: new Date() };
    }
    startDateChanged = (date: Date) => (this.params.startDate = date);

    endDateChanged = (date: Date) => (this.params.endDate = date);

    ok = () => {
        let start, end;
        if (this.params.startDate) {
            start = moment(this.params.startDate);
        }
        if (this.params.endDate) {
            end = moment(this.params.endDate);
        }
        if (start && end && end < start) {
            toast.error(this.translate.instant('sitnet_endtime_before_starttime'));
        } else if (start && end) {
            this.modal.close({
                $value: {
                    start: start.format('DD.MM.YYYY'),
                    end: end.format('DD.MM.YYYY'),
                },
            });
        }
    };
    cancel = function () {
        this.dismiss({ $value: 'cancel' });
    };
}
