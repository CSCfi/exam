// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

export interface Role {
    name: string;
    displayName?: string;
    icon?: string;
}

export enum PermissionType {
    CAN_INSPECT_LANGUAGE = 'CAN_INSPECT_LANGUAGE',
    CAN_CREATE_BYOD_EXAM = 'CAN_CREATE_BYOD_EXAM',
}

export interface Permission {
    id: number;
    type: PermissionType;
}

export interface User {
    id: number;
    eppn: string;
    firstName: string;
    lastName: string;
    email: string;
    lang: string;
    loginRole: string | null;
    roles: Role[];
    userAgreementAccepted: boolean;
    userIdentifier: string;
    permissions: { type: string }[];
    isAdmin: boolean;
    isStudent: boolean;
    isTeacher: boolean;
    isLanguageInspector: boolean;
    employeeNumber: string | null;
    lastLogin: string | null;
    canCreateByodExam: boolean;
    externalUserOrg?: string;
}
