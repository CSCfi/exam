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
        preventDuplicates: true,
    };

    constructor(private translate: TranslateService) {}

    display = (data: string[]) => {
        const startsAt = moment(data[4]);
        const now = moment();
        if (now.isDST()) {
            startsAt.add(-1, 'hour');
        }
        const i18nRoom = this.translate.instant('sitnet_at_room');
        const i18nMachine = this.translate.instant('sitnet_at_machine');
        if (startsAt.isAfter(now)) {
            const i18nLocation = this.translate.instant('sitnet_at_location');
            const i18nTime = this.translate.instant('sitnet_your_exam_will_start_at');
            toast.warning(
                `${i18nTime} ${startsAt.format('HH:mm')} ${i18nLocation} ${data[0]}: ${data[1]}, ${i18nRoom} ${
                    data[2]
                } ${i18nMachine} ${data[3]}`,
                '',
                this.opts,
            );
        } else {
            const i18nLocation = this.translate.instant('sitnet_you_have_ongoing_exam_at_location');
            toast.error(
                `${i18nLocation}: ${data[0]}, ${data[1]} ${i18nRoom} ${data[2]} ${i18nMachine} ${data[3]}`,
                '',
                this.opts,
            );
        }
    };

    displayWrongUserAgent = (startsAtTxt: string) => {
        const opts = {
            timeOut: 10000,
            preventDuplicates: true,
        };
        const startsAt = moment(startsAtTxt);
        const now = moment();
        if (startsAt.isAfter(now)) {
            toast.warning(
                `${this.translate.instant('sitnet_seb_exam_about_to_begin')} ${startsAt.format('HH:mm')}`,
                '',
                opts,
            );
        } else {
            toast.error(this.translate.instant('sitnet_seb_exam_ongoing'), '', opts);
        }
    };
}
