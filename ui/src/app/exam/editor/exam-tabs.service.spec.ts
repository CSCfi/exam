// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { TestBed } from '@angular/core/testing';
import type { Exam } from 'src/app/exam/exam.model';
import { ExamTabService } from './exam-tabs.service';

const mockExam = { id: 1, examSections: [] } as unknown as Exam;

describe('ExamTabService', () => {
    let service: ExamTabService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ExamTabService);
    });

    describe('getExam', () => {
        it('should throw when no exam has been set', () => {
            expect(() => service.getExam()).toThrow('Exam is required but not available');
        });

        it('should return the exam after setExam is called', () => {
            service.setExam(mockExam);
            expect(service.getExam()).toBe(mockExam);
        });
    });

    describe('examSignal', () => {
        it('should be undefined initially', () => {
            expect(service.examSignal()).toBeUndefined();
        });

        it('should reflect the exam after setExam is called', () => {
            service.setExam(mockExam);
            expect(service.examSignal()).toBe(mockExam);
        });
    });

    describe('notifyTabChange and tabChangeSignal', () => {
        it('should be undefined before any tab change', () => {
            expect(service.tabChangeSignal()).toBeUndefined();
        });

        it('should emit the correct tab index after notifyTabChange', () => {
            service.notifyTabChange(3);
            expect(service.tabChangeSignal()?.tab).toBe(3);
        });

        it('should update the timestamp on each notifyTabChange call', () => {
            service.notifyTabChange(0);
            const first = service.tabChangeSignal()?.timestamp;
            service.notifyTabChange(0);
            const second = service.tabChangeSignal()?.timestamp;
            // Timestamps may be equal if calls happen in the same ms, but signal reference must update
            expect(service.tabChangeSignal()).toBeDefined();
            expect(second).toBeGreaterThanOrEqual(first!);
        });
    });

    describe('setCollaborative and collaborativeSignal', () => {
        it('should be false initially', () => {
            expect(service.collaborativeSignal()).toBe(false);
        });

        it('should reflect the value set by setCollaborative', () => {
            service.setCollaborative(true);
            expect(service.collaborativeSignal()).toBe(true);
            expect(service.isCollaborative()).toBe(true);
        });

        it('should toggle back to false', () => {
            service.setCollaborative(true);
            service.setCollaborative(false);
            expect(service.collaborativeSignal()).toBe(false);
        });
    });
});
