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

import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';

import { SessionService } from './session/session.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    constructor(private Session: SessionService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler) {
        // Get the auth token from the service.
        const user = this.Session.getUser();
        if (!user) {
            return next.handle(req);
        }

        const authReq = req.clone({
            headers: req.headers
                .set('Cache-Control', 'no-cache')
                .set('Pragma', 'no-cache')
                .set('x-exam-authentication', user.token)
        });

        // send cloned request with header to the next handler.
        return next.handle(authReq);
    }
}
