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
import { AsyncPipe, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Duration } from 'luxon';
import { Observable, Subject, interval, map, startWith, switchMap, take } from 'rxjs';

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
                            <span class="exam-clock skip" role="region" [attr.aria-live]="'polite'">{{
                                ('i18l_examination_time_warning' | translate) + ': ' + ariaLiveTime
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
    standalone: true,
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
    private subject = new Subject<number>();
    private destroy = new Subject();

    constructor(private http: HttpClient) {}

    ngOnInit() {
        const sync$ = this.http.get<number>(`/app/time/${this.examHash}`);
        interval(this.syncInterval * 1000)
            .pipe(
                startWith(0),
                switchMap(() =>
                    sync$.pipe(
                        switchMap((t) =>
                            interval(1000).pipe(
                                map((n) => t - n),
                                take(this.syncInterval),
                            ),
                        ),
                    ),
                ),
            )
            .subscribe(this.subject);

        this.remainingTime$ = this.subject.pipe(map((n) => Duration.fromObject({ seconds: n }).toFormat('hh:mm:ss')));
        this.remainingTime$.subscribe({
            next: (time) => {
                const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
                const hourRegex = /^([0-9]|1[0-9]|2[0-3]):00:00$/;
                const halfHourRegex = /^(0[0-9]|1[0-9]|2[0-3]):30:00$/;
                const tenMinutesRegex = /^00:10:00$/;
                const fiveMinutesRegex = /^00:05:00$/;
                const minuteRegex = /^00:01:00$/;

                if (!timeRegex.test(time)) return;

                if (
                    hourRegex.test(time) ||
                    halfHourRegex.test(time) ||
                    tenMinutesRegex.test(time) ||
                    fiveMinutesRegex.test(time) ||
                    minuteRegex.test(time)
                ) {
                    this.ariaLiveTime = time;
                }
            },
            error: (error) => {
                console.error('Error:', error);
            },
            complete: () => {
                console.log('Observable complete');
            },
        });
        this.isTimeScarce$ = this.subject.pipe(map((n) => n <= this.alarmThreshold));
        this.subject.subscribe((n) => {
            if (n === 0) this.timedOut.emit();
        });
        this.showRemainingTime.set(true);
    }

    ngOnDestroy() {
        this.destroy.next(undefined);
        this.destroy.complete();
    }
}
