// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WrongLocationService } from 'src/app/enrolment/wrong-location/wrong-location.service';
import { ExaminationStatusService } from 'src/app/examination/examination-status.service';

export const examinationInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: (req: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>,
) => {
    const router = inject(Router);
    const WrongLocation = inject(WrongLocationService);
    const ExaminationStatus = inject(ExaminationStatusService);

    return next(req).pipe(
        tap((event: HttpEvent<unknown>) => {
            if (event instanceof HttpResponse) {
                const response = event as HttpResponse<unknown>;
                const earlyLogin = response.headers.get('x-exam-aquarium-login');
                const unknownMachine = response.headers.get('x-exam-unknown-machine');
                const wrongRoom = response.headers.get('x-exam-wrong-room');
                const wrongMachine = response.headers.get('x-exam-wrong-machine');
                const wrongUserAgent = response.headers.get('x-exam-wrong-agent-config');
                const hash = response.headers.get('x-exam-start-exam');
                const enrolmentId = response.headers.get('x-exam-upcoming-exam');
                if (unknownMachine) {
                    const location = b64ToUtf8(unknownMachine).split(':::');
                    WrongLocation.display(location); // Show warning notice on screen
                } else if (wrongRoom) {
                    ExaminationStatus.notifyWrongLocation();
                    const parts = b64ToUtf8(wrongRoom).split(':::');
                    router.navigate(['/wrongroom', parts[0], parts[1]]);
                } else if (wrongMachine) {
                    ExaminationStatus.notifyWrongLocation();
                    const parts = b64ToUtf8(wrongMachine).split(':::');
                    router.navigate(['/wrongmachine', parts[0], parts[1]]);
                } else if (wrongUserAgent) {
                    WrongLocation.displayWrongUserAgent(wrongUserAgent); // Show warning notice on screen
                } else if (enrolmentId) {
                    // Go to waiting room
                    const parts = enrolmentId.split(':::');
                    ExaminationStatus.notifyUpcomingExamination();
                    const id = enrolmentId === 'none' ? '' : parts[1];
                    if (enrolmentId === 'none') {
                        // No upcoming exams
                        router.navigate(['/waitingroom']);
                    } else {
                        router.navigate(['/waitingroom', id, parts[0]]);
                    }
                } else if (hash) {
                    // Start/continue exam
                    ExaminationStatus.notifyStartOfExamination();
                    router.navigate(['/exam', hash]);
                } else if (earlyLogin) {
                    const parts = earlyLogin.split(':::');
                    const id = earlyLogin === 'none' ? '' : parts[1];
                    ExaminationStatus.notifyAquariumLogin();
                    router.navigate(['/early', id, parts[0]]);
                }
            }
        }),
    );
};

const b64ToUtf8 = (str: string) =>
    decodeURIComponent(
        window
            .atob(str)
            .split('')
            .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
            .join(''),
    );
