// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { AsyncPipe, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Duration } from 'luxon';
import { Observable, Subject, filter, interval, map, startWith, switchMap, take, takeUntil } from 'rxjs';

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
                            <span
                                class="exam-clock"
                                role="region"
                                [ngClass]="(isTimeScarce$ | async) ? 'text-warning' : ''"
                                >{{ remainingTime$ | async }}</span
                            >
                        }
                        @if (ariaLiveTime) {
                            <span class="exam-clock skip" role="region" [attr.aria-live]="'polite'">{{
                                ('i18n_examination_time_warning' | translate) + ': ' + ariaLiveTime
                            }}</span>
                        }
                    </div>
                    <div class="col-2">
                        <button
                            (click)="showRemainingTime.set(!showRemainingTime())"
                            class="border-none background-none"
                        >
                            <img src="/assets/images/icon_clock.svg" alt="{{ 'i18n_show_hide_clock' | translate }}" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>`,
    imports: [NgClass, AsyncPipe, TranslateModule],
    styleUrl: './examination-clock.component.scss',
})
export class ExaminationClockComponent implements OnInit, OnDestroy {
    @Input() examHash = '';
    @Output() timedOut = new EventEmitter<void>();

    showRemainingTime = signal(false);
    remainingTime$?: Observable<string>;
    isTimeScarce$?: Observable<boolean>;
    ariaLiveTime?: string;

    private syncInterval = 60;
    private alarmThreshold = 300;
    private clock = new Subject<number>();
    private ngUnsubscribe = new Subject();

    constructor(private http: HttpClient) {}

    ngOnInit() {
        const sync$ = this.http.get<number>(`/app/time/${this.examHash}`);
        interval(this.syncInterval * 1000)
            .pipe(
                takeUntil(this.ngUnsubscribe),
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

        this.remainingTime$ = this.clock.pipe(map((n) => Duration.fromObject({ seconds: n }).toFormat('hh:mm:ss')));
        this.clock
            .pipe(
                filter((t) => t % (60 * 30) === 0 || [1, 5, 10].some((n) => t === 60 * n)),
                map((t) => Duration.fromObject({ seconds: t }).toFormat('hh:mm:ss')),
            )
            .subscribe((time) => (this.ariaLiveTime = time));
        this.isTimeScarce$ = this.clock.pipe(map((n) => n <= this.alarmThreshold));
        this.clock.subscribe((n) => {
            if (n === 0) this.timedOut.emit();
        });
        this.showRemainingTime.set(true);
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }
}
