import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Accessibility } from 'src/app/reservation/reservation.model';

@Injectable({ providedIn: 'root' })
export class AccessibilityService {
    constructor(private http: HttpClient) {}

    accessibilityApi = (id?: number) => (id ? `/app/accessibility/${id}` : '/app/accessibility');
    roomAccessibilityApi = (roomId: number) => `/app/room/${roomId}/accessibility`;

    getAccessibilities = () => this.http.get<Accessibility[]>(this.accessibilityApi());
    addAccessibility = (body: { name: string }) => this.http.post<Accessibility>(this.accessibilityApi(), body);
    updateAccessibility = (accessibility: Accessibility) =>
        this.http.put<Accessibility>(this.accessibilityApi(), accessibility);
    removeAccessibility = (accessibilityId: number) => this.http.delete<void>(this.accessibilityApi(accessibilityId));
    updateRoomAccessibilities = (roomId: number, body: { ids: string }) =>
        this.http.post<void>(this.roomAccessibilityApi(roomId), body);
}
