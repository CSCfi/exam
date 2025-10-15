// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers.validation;

@FunctionalInterface
public interface ValidationRule<T> {
    ValidationResult validate(T target);
}
