// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable, signal } from '@angular/core';
import { Exam } from 'src/app/exam/exam.model';

@Injectable({ providedIn: 'root' })
export class ExamTabService {
    private readonly tabChange = signal<{ tab: number; timestamp: number } | undefined>(undefined);
    private readonly exam = signal<Exam | undefined>(undefined);
    private readonly collaborative = signal(false);

    get tabChangeSignal() {
        return this.tabChange.asReadonly();
    }
    get examSignal() {
        return this.exam.asReadonly();
    }
    get collaborativeSignal() {
        return this.collaborative.asReadonly();
    }

    notifyTabChange = (tab: number) => this.tabChange.set({ tab, timestamp: Date.now() });
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
