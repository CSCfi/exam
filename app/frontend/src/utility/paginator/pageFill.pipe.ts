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
import { Pipe, PipeTransform } from '@angular/core';
import { range } from 'lodash';

@Pipe({ name: 'pageFill' })
export class PageFillPipe implements PipeTransform {
    transform = (input: number[], total: number, current: number, pageSize: number): number[] => {
        const pages = Math.floor(total / pageSize);
        if (pages > 0 && current === pages) {
            const amount = (pages + 1) * pageSize - total;
            return input.concat(range(0, amount));
        }
        return input;
    };
}
