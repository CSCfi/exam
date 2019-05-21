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

import * as toast from 'toastr';
import { Exam } from '../../exam/exam.model';
import { EnrolmentService } from '../enrolment.service';
import { Component, Input } from '@angular/core';
import { Location } from '@angular/common';

@Component({
    selector: 'exam-search-result',
    template: require('./examSearchResult.component.html')
})
export class ExamSearchResultComponent {

    @Input() exam: Exam;
    @Input() collaborative: boolean;

    enrolling: boolean;

    constructor(
        private location: Location,
        private Enrolment: EnrolmentService
    ) { }

    enrollForExam = () => {
        if (this.enrolling) {
            return;
        }
        this.enrolling = true;
        this.Enrolment.checkAndEnroll(this.exam, this.collaborative)
            .subscribe(() => this.enrolling = false, err => toast.error(err.data));
    }

    makeReservation = () => this.location.go(
        (this.collaborative ? '/calendar/collaborative/' : '/calendar/') + this.exam.id
    )

}
