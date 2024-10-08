/*
 * Copyright (c) 2018 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the 'Licence');
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an 'AS IS' basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, map } from 'rxjs';
import type { User } from 'src/app/session/session.service';
import { deduplicate } from 'src/app/shared/miscellaneous/helpers';

@Injectable({ providedIn: 'root' })
export class UserService {
    constructor(private http: HttpClient) {}

    listUsersByRole$ = (role: string) => this.http.get<User[]>(`/app/users/byrole/${role}`);
    listUsersByRoles$ = (roles: string[]) => {
        const requests = roles.map((r) => this.http.get<User[]>(`/app/users/byrole/${r}`));
        return forkJoin(requests).pipe(map((u) => deduplicate<User>(u.flat(), 'id')));
    };
}
