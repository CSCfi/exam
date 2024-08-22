// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DefaultWorkingHours } from 'src/app/reservation/reservation.model';

export interface Software {
    id: number;
    name: string;
    turnedOn: boolean;
}

export type MaintenancePeriod = {
    id?: number;
    startsAt: string;
    endsAt: string;
    description: string;
};

export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface Day {
    index: number;
    type: string;
}

export type Week = { [day: string]: Day[] };

export interface WorkingHour {
    startingHour: string;
    selected: boolean;
}

export interface DefaultWorkingHoursWithEditing extends DefaultWorkingHours {
    editing: boolean;
    pickStartingTime: { hour: number; minute: number; second: number; millisecond?: number };
    pickEndingTime: { hour: number; minute: number; second: number; millisecond?: number };
    displayStartingTime: { hour: number; minute: number; second: number; millisecond?: number };
    displayEndingTime: { hour: number; minute: number; second: number; millisecond?: number };
}

export interface Availability {
    start: string;
    end: string;
    total: number;
    reserved: number;
}

export interface Address {
    id: number;
    city: string;
    zip: string;
    street: string;
}

export type RepetitionConfig = {
    start: Date;
    end: Date;
    weekdays: { ord: number; name: string }[];
    dayOfMonth?: number;
    monthlyOrdinal?: { name: string; ord: number };
    monthlyWeekday?: { name: string; ord: number };
    yearlyMonth?: { name: string; ord: number };
};
