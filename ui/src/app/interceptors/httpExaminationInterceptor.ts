/*
 * Copyright (c) 2018 Exam Consortium
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
import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { StateService } from '@uirouter/core';
import * as base64 from 'base64-js';
import { tap } from 'rxjs/operators';

import { WrongLocationService } from '../enrolment/wrong-location/wrongLocation.service';
import { ExaminationStatusService } from '../examination/examinationStatus.service';

import type { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';

@Injectable()
export class ExaminationInterceptor implements HttpInterceptor {
    constructor(
        private state: StateService,
        private WrongLocation: WrongLocationService,
        private ExaminationStatus: ExaminationStatusService,
    ) {}
    intercept(req: HttpRequest<unknown>, next: HttpHandler) {
        return next.handle(req).pipe(
            tap((event: HttpEvent<unknown>) => {
                if (event instanceof HttpResponse) {
                    const b64ToUtf8 = (str: string, encoding = 'utf-8'): string => {
                        const bytes = base64.toByteArray(str);
                        return new TextDecoder(encoding).decode(bytes);
                    };
                    const response = event as HttpResponse<unknown>;
                    const unknownMachine = response.headers.get('x-exam-unknown-machine');
                    const wrongRoom = response.headers.get('x-exam-wrong-room');
                    const wrongMachine = response.headers.get('x-exam-wrong-machine');
                    const wrongUserAgent = response.headers.get('x-exam-wrong-agent-config');
                    const hash = response.headers.get('x-exam-start-exam');

                    const enrolmentId = response.headers.get('x-exam-upcoming-exam');
                    let parts: string[];
                    if (unknownMachine) {
                        const location = b64ToUtf8(unknownMachine).split(':::');
                        this.WrongLocation.display(location); // Show warning notice on screen
                    } else if (wrongRoom) {
                        this.ExaminationStatus.notifyWrongLocation();
                        parts = b64ToUtf8(wrongRoom).split(':::');
                        this.state.go('wrongRoom', { eid: parts[0], mid: parts[1] });
                    } else if (wrongMachine) {
                        this.ExaminationStatus.notifyWrongLocation();
                        parts = b64ToUtf8(wrongMachine).split(':::');
                        this.state.go('wrongMachine', { eid: parts[0], mid: parts[1] });
                    } else if (wrongUserAgent) {
                        this.WrongLocation.displayWrongUserAgent(wrongUserAgent); // Show warning notice on screen
                    } else if (enrolmentId) {
                        // Go to waiting room
                        parts = enrolmentId.split(':::');
                        this.ExaminationStatus.notifyUpcomingExamination();
                        const id = enrolmentId === 'none' ? '' : parts[1];
                        if (enrolmentId === 'none') {
                            // No upcoming exams
                            this.state.go('waitingRoomNoExam');
                        } else {
                            this.state.go('waitingRoom', { id: id, hash: parts[0] });
                        }
                    } else if (hash) {
                        // Start/continue exam
                        this.ExaminationStatus.notfityStartOfExamination();
                        this.state.go('examination', { hash: hash });
                    }
                    return response;
                }
            }),
        );
    }
}
