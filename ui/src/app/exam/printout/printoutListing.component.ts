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
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import * as moment from 'moment';
import { map } from 'rxjs/operators';

import type { Exam } from '../exam.model';

@Component({
    selector: 'printout-listing',
    templateUrl: './printoutListing.component.html',
})
export class PrintoutListingComponent {
    printouts: (Exam & { examinationDatesAggregate: string })[];
    predicate: string;
    reverse: boolean;
    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.predicate = 'examinationDatesAggregate';
        this.reverse = true;
        this.http
            .get<Exam[]>('/app/exam/printouts')
            .pipe(
                map((exams) => {
                    return exams.map((p) => {
                        const dates = p.examinationDates.map((ed) => ed.date).sort();
                        return {
                            ...p,
                            examinationDatesAggregate: dates.map((d) => moment(d).format('DD.MM.YYYY')).join(', '),
                        };
                    });
                }),
            )
            .subscribe((printouts) => (this.printouts = printouts));
    }

    setPredicate = (predicate: string) => {
        if (this.predicate === predicate) {
            this.reverse = !this.reverse;
        }
        this.predicate = predicate;
    };
}
