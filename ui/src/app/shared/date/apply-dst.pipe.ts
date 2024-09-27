/*
 * Copyright (c) 2018 Exam Consortium
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
import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { DateTime } from 'luxon';
import { DateTimeService } from './date.service';

@Pipe({
    name: 'applyDst',
    standalone: true,
})
export class ApplyDstPipe implements PipeTransform {
    constructor(private DateTimeService: DateTimeService) {}
    transform = (input?: string): string => {
        if (!input) return '';
        const date = DateTime.fromISO(input);
        if (this.DateTimeService.isDST(date.toJSDate())) {
            return date.minus({ hours: 1 }).toISO() as string;
        }
        return input;
    };
}
