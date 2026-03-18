// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExaminationStatusService {
    // Bundles all status signals into one so consumers only need a single subscription
    readonly combinedStatusSignal = computed(() => ({
        starting: this.examinationStartingSignal(),
        upcoming: this.upcomingExamSignal(),
        wrongLocation: this.wrongLocationSignal(),
        aquarium: this.aquariumLoggedInSignal(),
    }));

    // number signals carry a timestamp so repeated notifications always produce a new value
    private readonly examinationEnding = signal<number | undefined>(undefined);
    private readonly wrongLocation = signal<number | undefined>(undefined);
    private readonly upcomingExam = signal<number | undefined>(undefined);
    private readonly examinationStarting = signal<number | undefined>(undefined);
    private readonly aquariumLoggedIn = signal<boolean>(true);

    get examinationEndingSignal() {
        return this.examinationEnding.asReadonly();
    }
    get wrongLocationSignal() {
        return this.wrongLocation.asReadonly();
    }
    get upcomingExamSignal() {
        return this.upcomingExam.asReadonly();
    }
    get examinationStartingSignal() {
        return this.examinationStarting.asReadonly();
    }
    get aquariumLoggedInSignal() {
        return this.aquariumLoggedIn.asReadonly();
    }

    notifyEndOfExamination = () => this.examinationEnding.set(Date.now());
    notifyWrongLocation = () => this.wrongLocation.set(Date.now());
    notifyUpcomingExamination = () => this.upcomingExam.set(Date.now());
    notifyStartOfExamination = () => this.examinationStarting.set(Date.now());
    notifyAquariumLogin = () => this.aquariumLoggedIn.set(true);
}
