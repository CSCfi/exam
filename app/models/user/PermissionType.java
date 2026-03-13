// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.user;

import io.ebean.annotation.EnumValue;

public enum PermissionType {
    @EnumValue("1")
    CAN_INSPECT_LANGUAGE,
    @EnumValue("2")
    CAN_CREATE_BYOD_EXAM,
}
