// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

export interface Link {
    route: string;
    visible: boolean;
    name: string;
    iconSvg?: string;
    iconPng?: string;
    submenu: { hidden: boolean; items: Link[] };
}
