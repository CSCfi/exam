// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package exceptions;

public class NotFoundException extends Exception {

    public NotFoundException() {}

    public NotFoundException(String message) {
        super(message);
    }
}
