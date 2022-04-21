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
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';

@Injectable()
export class ExaminationStatusService {
    public examinationEnding$: Observable<void>;
    public wrongLocation$: Observable<void>;
    public upcomingExam$: Observable<void>;
    public examinationStarting$: Observable<void>;
    private examinationEndingSubscription = new Subject<void>();
    private wrongLocationSubscription = new Subject<void>();
    private upcomingExamSubscription = new Subject<void>();
    private examinationStartingSubscription = new Subject<void>();

    constructor() {
        this.examinationEnding$ = this.examinationEndingSubscription.asObservable();
        this.wrongLocation$ = this.wrongLocationSubscription.asObservable();
        this.upcomingExam$ = this.upcomingExamSubscription.asObservable();
        this.examinationStarting$ = this.examinationStartingSubscription.asObservable();
    }

    notifyEndOfExamination = () => this.examinationEndingSubscription.next();
    notifyWrongLocation = () => this.wrongLocationSubscription.next();
    notifyUpcomingExamination = () => this.upcomingExamSubscription.next();
    notfityStartOfExamination = () => this.examinationStartingSubscription.next();
}
