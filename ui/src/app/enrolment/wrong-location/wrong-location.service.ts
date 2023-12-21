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
import { format, parseISO } from 'date-fns';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class WrongLocationService {
    constructor(private translate: TranslateService, private toast: ToastrService) {}

    display = (data: string[]) => {
        const [campus, building, room, machine, start, zone] = data;
        const time = this.getTime(DateTime.fromISO(start, { zone: zone }));
        const timeFmt = time.toLocaleString(DateTime.TIME_24_SIMPLE);
        const i18nRoom = this.translate.instant('i18n_at_room');
        const i18nMachine = this.translate.instant('i18n_at_machine');
        if (time.toJSDate() > new Date()) {
            const i18nLocation = this.translate.instant('i18n_at_location');
            const i18nTime = this.translate.instant('i18n_your_exam_will_start_at');
            this.toast.warning(
                `${i18nTime} ${timeFmt} (${zone}) ${i18nLocation} ${campus}: ${building}, ${i18nRoom} ${room} ${i18nMachine} ${machine}`,
                '', // TODO: should we have some title for this (needs translation)
                { timeOut: 10000 },
            );
        } else {
            const i18nLocation = this.translate.instant('i18n_you_have_ongoing_exam_at_location');
            this.toast.error(
                `${i18nLocation}: ${campus}, ${building} ${i18nRoom} ${room} ${i18nMachine} ${machine}`,
                '', // TODO: should we have some title for this (needs translation)
                { timeOut: 10000 },
            );
        }
    };

    displayWrongUserAgent = (startsAtTxt: string) => {
        const startsAt = parseISO(startsAtTxt); // TODO: what about timezone here?
        if (startsAt > new Date()) {
            this.toast.warning(
                `${this.translate.instant('i18n_seb_exam_about_to_begin')} ${format(startsAt, 'HH:mm')}`,
                '', // TODO: should we have some title for this (needs translation)
                { timeOut: 10000 },
            );
        } else {
            this.toast.error(this.translate.instant('i18n_seb_exam_ongoing'), '', { timeOut: 10000 });
        }
    };

    private getTime = (date: DateTime): DateTime => (date.isInDST ? date.minus({ hours: 1 }) : date);
}
