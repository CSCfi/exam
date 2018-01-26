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
import * as moment from 'moment';
import * as _ from 'lodash';
import truncate from 'truncate-html';

export interface ITruncateFilterService extends angular.IFilterService {
    (name: 'truncate'): (value: string, after: number) => string;
}
export class TruncateFilter {
    constructor() {
        return (value: string, after: number): string => {
            return truncate(value, after);
        };
    }
}

export interface IDiffInMinutesFilterService extends angular.IFilterService {
    (name: 'diffInMinutesTo'): (from: VarDate, to: VarDate) => number;
}
export class DiffInMinutesFilter {
    constructor() {
        return (from: VarDate, to: VarDate): number => {
            const diff = (new Date(to).getTime() - new Date(from).getTime()) / 1000 * 60;
            return Math.round(diff);
        };
    }
}

export interface IDiffInDaysFilterService extends angular.IFilterService {
    (name: 'diffInDaysToNow'): (date: VarDate) => string;
}
export class DiffInDaysFilter {
    constructor() {
        const msInDay = 1000 * 60 * 60 * 24;
        return (date: VarDate): string => {
            const diff = (new Date(date).getTime() - new Date().getTime()) / msInDay;
            if (diff < 0) {
                return '<span class="sitnet-text-alarm">' + Math.floor(diff) + '</span>';
            }
            return '<span>' + Math.floor(diff) + '</span>';
        };
    }
}

export interface IOffsetFilterService extends angular.IFilterService {
    (name: 'offset'): (input: string, start: string) => string;
}
export class OffsetFilter {
    constructor() {
        return (input: string, start: string): string => {
            const offset = parseInt(start);
            return input.slice(offset);
        };
    }
}

export interface IPageFillFilterService extends angular.IFilterService {
    (name: 'pagefill'): (input: number[], total: number, current: number, pageSize: number) => number[];
}
export class PageFillFilter {
    constructor() {
        return (input: number[], total: number, current: number, pageSize: number): number[] => {
            const pages = Math.floor(total / pageSize);
            if (pages > 0 && current === pages) {
                const amount = (pages + 1) * pageSize - total;
                return input.concat(_.range(0, amount));
            }
            return input;
        };
    }
}

export interface IAdjustDstFilterService extends angular.IFilterService {
    (name: 'adjustdst'): (input: moment.MomentInput) => string;
}
export class AdjustDstFilter {
    constructor() {
        return (input: moment.MomentInput): string => {
            if (moment(input).isDST()) {
                return moment(input).add(-1, 'hour').format();
            }
            return moment(input).format();
        };
    }
}
