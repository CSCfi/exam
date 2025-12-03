// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

export interface Option<V, I> {
    value?: V;
    id?: I;
    label: string | null;
    isHeader?: boolean;
}
