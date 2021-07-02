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
import { Component, Input } from '@angular/core';
import { StateService } from '@uirouter/core';

import { EnrolmentInfo } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';

@Component({
    selector: 'exam-search-result',
    templateUrl: './examSearchResult.component.html',
})
export class ExamSearchResultComponent {
    @Input() exam: EnrolmentInfo;
    @Input() collaborative: boolean;

    enrolling: boolean;

    constructor(private State: StateService, private Enrolment: EnrolmentService) {}

    enrollForExam = () => {
        if (this.enrolling) {
            return;
        }
        this.enrolling = true;
        this.Enrolment.checkAndEnroll(this.exam, this.collaborative).subscribe(() => (this.enrolling = false));
    };

    makeReservation = () => {
        if (this.exam.implementation !== 'AQUARIUM') {
            this.State.go('dashboard');
        } else {
            this.State.go(this.collaborative ? 'collaborativeCalendar' : 'calendar', { id: this.exam.id });
        }
    };
}
