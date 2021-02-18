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
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { WindowRef } from '../../utility/window/window.service';

@Component({
    selector: 'examination-clock',
    templateUrl: './examinationClock.component.html',
})
export class ExaminationClockComponent {
    @Input() examHash: string;
    @Output() onTimeout = new EventEmitter<void>();
    syncInterval = 15;
    secondsSinceSync = this.syncInterval + 1;
    alarmThreshold = 300;
    remainingTime = this.alarmThreshold + 1;
    showRemainingTime = true;
    pollerId: number;

    constructor(private http: HttpClient, private Window: WindowRef) {}

    ngOnInit() {
        this.checkRemainingTime();
    }

    ngOnDestroy() {
        if (this.pollerId) {
            this.Window.nativeWindow.clearTimeout(this.pollerId);
        }
    }

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

        this.pollerId = this.Window.nativeWindow.setTimeout(this.checkRemainingTime, 1000);
    };

    private setRemainingTime = () =>
        this.http.get<number>('/app/time/' + this.examHash).subscribe((resp) => (this.remainingTime = resp));

    private notifyTimeout = () => {
        this.Window.nativeWindow.clearTimeout(this.pollerId);
        this.onTimeout.emit();
    };

    private zeroPad = (n: number): string => ('0' + n).slice(-2);

    formatRemainingTime = (): string => {
        if (!this.remainingTime) {
            return '';
        }
        const hours = Math.floor(this.remainingTime / 60 / 60);
        const minutes = Math.floor(this.remainingTime / 60) % 60;
        const seconds = this.remainingTime % 60;
        return `${hours}:${this.zeroPad(minutes)}:${this.zeroPad(seconds)}`;
    };
}
