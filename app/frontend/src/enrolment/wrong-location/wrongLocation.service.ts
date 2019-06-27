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
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import * as toast from 'toastr';


@Injectable()
export class WrongLocationService {

    opts: ToastrOptions = {
        timeOut: 10000,
        preventDuplicates: true
    };

    constructor(
        private translate: TranslateService
    ) { }

    display = (data: string[]) => {
        let startsAt = moment(data[4]);
        const now = moment();
        if (now.isDST()) {
            startsAt.add(-1, 'hour');
        }
        let parts: string[];
        if (startsAt.isAfter(now)) {
            parts = ['sitnet_your_exam_will_start_at', 'sitnet_at_location', 'sitnet_at_room', 'sitnet_at_machine'];
            this.translate.instant(parts).then((t: any) =>
                toast.warning(
                    `${t.sitnet_your_exam_will_start_at} ${startsAt.format('HH:mm')}
                     ${t.sitnet_at_location} ${data[0]}: ${data[1]}, ${t.sitnet_at_room} ${data[2]}
                    ${t.sitnet_at_machine} ${data[3]}`, '', this.opts
                )
            );
        } else {
            parts = ['sitnet_you_have_ongoing_exam_at_location', 'sitnet_at_room', 'sitnet_at_machine'];
            this.translate.instant(parts).then((t: any) =>
                toast.error(
                    `${t.sitnet_you_have_ongoing_exam_at_location}: ${data[0]}, ${data[1]}
                    ${t.sitnet_at_room} ${data[2]} ${t.sitnet_at_machine} ${data[3]}`, '', this.opts
                )
            );
        }
    }

    displayWrongUserAgent = (startsAtTxt: string) => {
        const opts = {
            timeOut: 10000,
            preventDuplicates: true
        };
        let startsAt = moment(startsAtTxt);
        const now = moment();
        if (now.isDST()) {
            startsAt.add(-1, 'hour');
        }
        if (startsAt.isAfter(now)) {
            toast.warning(`${this.translate.instant('sitnet_seb_exam_about_to_begin')} ${startsAt.format('HH:mm')}`,
                '', opts);
        } else {
            toast.error(this.translate.instant('sitnet_seb_exam_ongoing'), '', opts);
        }
    }

}
