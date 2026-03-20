// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Exam } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';

@Injectable({ providedIn: 'root' })
export class ExamTabService {
    private readonly tabChange = signal<{ tab: number; timestamp: number } | undefined>(undefined);
    private readonly exam = signal<Exam | undefined>(undefined);
    private readonly collaborative = signal(false);

    private readonly Exam = inject(ExamService);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);

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

    saveExam$ = (overrides: Record<string, unknown> = {}, silent = false): Observable<Exam> =>
        this.Exam.updateExam$(this.getExam(), overrides, this.collaborative()).pipe(
            tap((savedExam) => {
                this.exam.set(savedExam);
                if (!silent) {
                    this.toast.info(this.translate.instant('i18n_exam_saved'));
                }
            }),
            catchError((err) => {
                this.toast.error(err);
                return throwError(() => new Error(err));
            }),
        );
}
