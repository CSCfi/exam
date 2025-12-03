// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExaminationStatusService {
    public examinationEnding$: Observable<void>;
    public wrongLocation$: Observable<void>;
    public upcomingExam$: Observable<void>;
    public examinationStarting$: Observable<void>;
    public aquariumLoggedIn$: Observable<boolean>;
    private examinationEndingSubscription = new Subject<void>();
    private wrongLocationSubscription = new Subject<void>();
    private upcomingExamSubscription = new Subject<void>();
    private examinationStartingSubscription = new Subject<void>();
    private aquariumLoggedInSubscription = new BehaviorSubject<boolean>(true);

    constructor() {
        this.examinationEnding$ = this.examinationEndingSubscription.asObservable();
        this.wrongLocation$ = this.wrongLocationSubscription.asObservable();
        this.upcomingExam$ = this.upcomingExamSubscription.asObservable();
        this.examinationStarting$ = this.examinationStartingSubscription.asObservable();
        this.aquariumLoggedIn$ = this.aquariumLoggedInSubscription.asObservable();
    }

    notifyEndOfExamination = () => this.examinationEndingSubscription.next();
    notifyWrongLocation = () => this.wrongLocationSubscription.next();
    notifyUpcomingExamination = () => this.upcomingExamSubscription.next();
    notifyStartOfExamination = () => this.examinationStartingSubscription.next();
    notifyAquariumLogin = () => this.aquariumLoggedInSubscription.next(true);
}
