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
import { addHours, format, parseISO } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { DateTimeService } from '../../shared/date/date.service';

@Injectable({ providedIn: 'root' })
export class WrongLocationService {
    constructor(private translate: TranslateService, private toast: ToastrService, private DateTime: DateTimeService) {}

    display = (data: string[]) => {
        window.setTimeout(() => {
            let startsAt = parseISO(data[4]);
            const now = new Date();
            if (this.DateTime.isDST(now)) {
                startsAt = addHours(startsAt, -1);
            }
            const i18nRoom = this.translate.instant('sitnet_at_room');
            const i18nMachine = this.translate.instant('sitnet_at_machine');
            if (startsAt > now) {
                const i18nLocation = this.translate.instant('sitnet_at_location');
                const i18nTime = this.translate.instant('sitnet_your_exam_will_start_at');
                this.toast.warning(
                    `${i18nTime} ${format(startsAt, 'HH:mm')} ${i18nLocation} ${data[0]}: ${data[1]}, ${i18nRoom} ${
                        data[2]
                    } ${i18nMachine} ${data[3]}`,
                    '',
                    { timeOut: 10000 },
                );
            } else {
                const i18nLocation = this.translate.instant('sitnet_you_have_ongoing_exam_at_location');
                this.toast.error(
                    `${i18nLocation}: ${data[0]}, ${data[1]} ${i18nRoom} ${data[2]} ${i18nMachine} ${data[3]}`,
                    '',
                    { timeOut: 10000 },
                );
            }
        }, 1000);
    };

    displayWrongUserAgent = (startsAtTxt: string) => {
        const startsAt = parseISO(startsAtTxt);
        if (startsAt > new Date()) {
            this.toast.warning(
                `${this.translate.instant('sitnet_seb_exam_about_to_begin')} ${format(startsAt, 'HH:mm')}`,
                '',
                { timeOut: 10000 },
            );
        } else {
            this.toast.error(this.translate.instant('sitnet_seb_exam_ongoing'), '', { timeOut: 10000 });
        }
    };
}
