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
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';

@Component({
    selector: 'xm-examination-clock',
    template: `<div class="floating-clock">
        <div class="row">
            <div class="header-wrapper col-12">
                <div class="row align-items-center p-2">
                    <div class="col-5" *ngIf="showRemainingTime">
                        <span class="sitnet-white">{{ 'i18n_exam_time_left' | translate }}: </span>
                    </div>
                    <div *ngIf="!showRemainingTime" class="col-5 clock-hide text-muted">
                        {{ 'i18n_clock_hidden' | translate }}
                    </div>
                    <div class="col-5">
                        <span
                            class="exam-clock"
                            role="region"
                            *ngIf="showRemainingTime"
                            [ngClass]="remainingTime <= alarmThreshold ? 'sitnet-text-alarm' : ''"
                            [attr.aria-live]="remainingTime <= alarmThreshold ? 'polite' : 'off'"
                            >{{ formatRemainingTime() }}</span
                        >
                    </div>
                    <div class="col-2">
                        <button (click)="showRemainingTime = !showRemainingTime" class="border-none background-none">
                            <img
                                src="/assets/images/icon_clock.svg"
                                alt="{{ 'i18n_show_hide_clock' | translate }}"
                                onerror="this.onerror=null;this.src='/assets/images/icon_clock.png';"
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div> `,
})
export class ExaminationClockComponent implements OnInit, OnDestroy {
    @Input() examHash = '';
    @Output() timedOut = new EventEmitter<void>();
    syncInterval = 15;
    secondsSinceSync = this.syncInterval + 1;
    alarmThreshold = 300;
    remainingTime = this.alarmThreshold + 1;
    showRemainingTime = true;
    pollerId = 0;

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.checkRemainingTime();
    }

    ngOnDestroy() {
        if (this.pollerId) {
            window.clearTimeout(this.pollerId);
        }
    }

    formatRemainingTime = (): string => {
        if (!this.remainingTime) {
            return '';
        }
        const hours = Math.floor(this.remainingTime / 60 / 60);
        const minutes = Math.floor(this.remainingTime / 60) % 60;
        const seconds = this.remainingTime % 60;
        return `${hours}:${this.zeroPad(minutes)}:${this.zeroPad(seconds)}`;
    };

    private checkRemainingTime = () => {
        this.secondsSinceSync++;
        if (this.secondsSinceSync > this.syncInterval) {
            // Sync time with backend
            this.secondsSinceSync = 0;
            this.setRemainingTime();
        } else if (this.remainingTime !== undefined) {
            // Decrease seconds
            this.remainingTime--;
        }
        if (this.remainingTime !== undefined && this.remainingTime <= 0) {
            this.notifyTimeout();
        }

        this.pollerId = window.setTimeout(this.checkRemainingTime, 1000);
    };

    private setRemainingTime = () =>
        this.http.get<number>('/app/time/' + this.examHash).subscribe((resp) => (this.remainingTime = resp));

    private notifyTimeout = () => {
        window.clearTimeout(this.pollerId);
        this.timedOut.emit();
    };

    private zeroPad = (n: number): string => ('0' + n).slice(-2);
}
