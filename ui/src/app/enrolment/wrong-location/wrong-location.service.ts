// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class WrongLocationService {
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);

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
        const startsAt = DateTime.fromISO(startsAtTxt); // TODO: what about timezone here?
        if (startsAt.toJSDate() > new Date()) {
            this.toast.warning(
                `${this.translate.instant('i18n_seb_exam_about_to_begin')} ${startsAt.toFormat('HH:mm')}`,
                '', // TODO: should we have some title for this (needs translation)
                { timeOut: 10000 },
            );
        } else {
            this.toast.error(this.translate.instant('i18n_seb_exam_ongoing'), '', { timeOut: 10000 });
        }
    };

    private getTime = (date: DateTime): DateTime => (date.isInDST ? date.minus({ hours: 1 }) : date);
}
