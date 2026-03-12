// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExaminationStatusService {
    // Signal-based API
    // Using timestamps for void events - each notification updates the timestamp, triggering effects
    readonly combinedStatusSignal = computed(() => ({
        starting: this.examinationStartingSignal(),
        upcoming: this.upcomingExamSignal(),
        wrongLocation: this.wrongLocationSignal(),
        aquarium: this.aquariumLoggedInSignal(),
    }));

    private readonly examinationEnding = signal<number | undefined>(undefined);
    private readonly wrongLocation = signal<number | undefined>(undefined);
    private readonly upcomingExam = signal<number | undefined>(undefined);
    private readonly examinationStarting = signal<number | undefined>(undefined);
    private readonly aquariumLoggedIn = signal<boolean>(true);

    // Readonly signals for components (preferred API)
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
