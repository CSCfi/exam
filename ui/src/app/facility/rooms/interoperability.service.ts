// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { ExamRoom } from 'src/app/reservation/reservation.model';

@Injectable({ providedIn: 'root' })
export class InteroperabilityService {
    private http = inject(HttpClient);

    updateFacility$ = (room: ExamRoom) => this.http.put<ExamRoom>(`/app/iop/facilities/${room.id}`, room);
}
