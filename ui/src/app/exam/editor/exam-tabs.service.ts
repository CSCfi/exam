// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable, signal } from '@angular/core';
import { Exam } from 'src/app/exam/exam.model';

export type UpdateProps = {
    code: string | null;
    name: string | null;
    scaleChange: boolean;
    initScale: boolean;
};

@Injectable({ providedIn: 'root' })
export class ExamTabService {
    // Signal-based API
    // Using wrapper objects to ensure effects fire even if same value is set twice
    private tabChange = signal<{ tab: number; timestamp: number } | undefined>(undefined);
    private examUpdate = signal<{ props: UpdateProps; timestamp: number } | undefined>(undefined);
    private exam = signal<Exam | undefined>(undefined);
    private collaborative = signal(false);

    // Readonly signals for components
    get tabChangeSignal() {
        return this.tabChange.asReadonly();
    }
    get examUpdateSignal() {
        return this.examUpdate.asReadonly();
    }
    get examSignal() {
        return this.exam.asReadonly();
    }
    get collaborativeSignal() {
        return this.collaborative.asReadonly();
    }

    notifyTabChange = (tab: number) => this.tabChange.set({ tab, timestamp: Date.now() });
    notifyExamUpdate = (props: UpdateProps) => this.examUpdate.set({ props, timestamp: Date.now() });
    setExam = (exam: Exam) => this.exam.set(exam);
    getExam = (): Exam => {
        const exam = this.exam();
        if (!exam) {
            throw new Error('Exam is required but not available');
        }
        return exam;
    };
    setCollaborative = (collaborative: boolean) => this.collaborative.set(collaborative);
    isCollaborative = () => this.collaborative();
}
