// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, Signal, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { Duration } from 'luxon';
import { Subject, filter, interval, map, startWith, switchMap, take } from 'rxjs';

@Component({
    selector: 'xm-examination-clock',
    template: `<div class="floating-clock">
        <div class="row">
            <div class="header-wrapper col-12">
                <div class="row align-items-start p-2">
                    @if (showRemainingTime()) {
                        <div class="col-5">
                            <span class="text-white">{{ 'i18n_exam_time_left' | translate }}: </span>
                        </div>
                    } @else {
                        <div class="col-5 clock-hide text-muted">
                            {{ 'i18n_clock_hidden' | translate }}
                        </div>
                    }
                    <div class="col-5">
                        @if (showRemainingTime()) {
                            <span class="exam-clock" role="region" [class.text-warning]="isTimeScarce()">{{
                                remainingTime()
                            }}</span>
                        }
                        @if (ariaLiveTime()) {
                            <span class="exam-clock skip" role="region" [ariaLive]="'polite'">{{
                                ('i18n_examination_time_warning' | translate) + ': ' + ariaLiveTime()
                            }}</span>
                        }
                    </div>
                    <div class="col-2">
                        <button (click)="toggleShowRemainingTime()" class="border-none background-none">
                            <img src="/assets/images/icon_clock.svg" alt="{{ 'i18n_show_hide_clock' | translate }}" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>`,
    imports: [TranslateModule],
    styleUrl: './examination-clock.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationClockComponent {
    readonly examHash = input('');
    readonly timedOut = output<void>();

    readonly showRemainingTime = signal(false);
    readonly ariaLiveTime = signal('');
    readonly remainingTime: Signal<string>;
    readonly isTimeScarce: Signal<boolean>;

    private readonly http = inject(HttpClient);
    private readonly destroyRef = inject(DestroyRef);
    private readonly syncInterval = 60;
    private readonly alarmThreshold = 300;
    private readonly clock = new Subject<number>();

    constructor() {
        this.remainingTime = toSignal(
            this.clock.pipe(map((n) => Duration.fromObject({ seconds: n }).toFormat('hh:mm:ss'))),
            { initialValue: '' },
        );
        this.isTimeScarce = toSignal(this.clock.pipe(map((n) => n <= this.alarmThreshold)), { initialValue: false });

        toObservable(this.examHash)
            .pipe(filter(Boolean), take(1), takeUntilDestroyed(this.destroyRef))
            .subscribe((currentExamHash) => {
                const sync$ = this.http.get<number>(`/app/time/${currentExamHash}`);
                interval(this.syncInterval * 1000)
                    .pipe(
                        takeUntilDestroyed(this.destroyRef),
                        startWith(0),
                        switchMap(() =>
                            sync$.pipe(
                                switchMap((t) =>
                                    interval(1000).pipe(
                                        map((n) => Math.max(0, t - n)),
                                        take(this.syncInterval),
                                    ),
                                ),
                            ),
                        ),
                    )
                    .subscribe(this.clock);

                this.clock
                    .pipe(
                        takeUntilDestroyed(this.destroyRef),
                        filter((t) => t % (60 * 30) === 0 || [1, 5, 10].some((n) => t === 60 * n)),
                        map((t) => Duration.fromObject({ seconds: t }).toFormat('hh:mm:ss')),
                    )
                    .subscribe((time) => this.ariaLiveTime.set(time));

                this.clock.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((n) => {
                    if (n === 0) this.timedOut.emit();
                });

                this.showRemainingTime.set(true);
            });
    }

    toggleShowRemainingTime() {
        this.showRemainingTime.update((v) => !v);
    }
}
