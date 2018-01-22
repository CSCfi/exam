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
import * as angular from 'angular';
import * as _ from 'lodash';

export class DateTimeService {

    constructor(private $translate: angular.translate.ITranslateService) { }

    printExamDuration(exam: { duration: number }): string {
        if (exam && exam.duration) {
            const h = Math.floor(exam.duration / 60);
            const m = exam.duration % 60;
            if (h === 0) {
                return m + ' min';
            } else if (m === 0) {
                return h + ' h';
            } else {
                return h + ' h ' + m + ' min';
            }
        }
        return '';
    }

    getDateForWeekday(ordinal): Date {
        const now = new Date();
        const distance = ordinal - now.getDay();
        return new Date(now.setDate(now.getDate() + distance));
    }

    getWeekdayNames(): string[] {
        const lang = this.$translate.use();
        const locale = lang.toLowerCase() + '-' + lang.toUpperCase();
        const options = { weekday: 'short' };
        return _.range(1, 6).concat(0).map(
            d => this.getDateForWeekday(d).toLocaleDateString(locale, options)
        );
    }
}
