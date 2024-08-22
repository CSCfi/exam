// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, map } from 'rxjs';
import type { User } from 'src/app/session/session.model';
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
