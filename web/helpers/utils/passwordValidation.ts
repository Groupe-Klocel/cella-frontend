/**
CELLA Frontend
Website and Mobile templates that can be used to communicate
with CELLA WMS APIs.
Copyright (C) 2023 KLOCEL <contact@klocel.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
**/

export interface PasswordPolicy {
    passwordLength: number;
    passwordMinDifferencePercent: number;
    passwordCheckPersonalInfo: boolean;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumber: boolean;
    passwordRequireSpecialChar: boolean;
}

export const PASSWORD_POLICY_CONFIG_SCOPE = 'security';

// Password policy configs (scope: security):
// - password_length: minimum password length (default 6)
// - password_min_difference_percent: minimum % of difference with the
//   previous password, 0 = check disabled (default 0)
// - password_check_personal_info: forbid personal information and simple
//   patterns in the password, 0/1 (default 0)
// - password_require_uppercase / password_require_lowercase /
//   password_require_number / password_require_special_char: complexity
//   criteria the password must satisfy, 0/1 (default 0)
export const getPasswordPolicy = (configs: any[] | undefined): PasswordPolicy => {
    const findValueByCode = (items: any[] | undefined, code: string) => {
        if (!items) return undefined;
        return items.find(
            (item: any) =>
                item.scope === PASSWORD_POLICY_CONFIG_SCOPE &&
                item.code.toLowerCase() === code.toLowerCase()
        )?.value;
    };

    const isEnabled = (value: any): boolean =>
        ['1', 'true', 'y', 'yes'].includes(String(value ?? '').toLowerCase());

    const parsedLength = parseInt(findValueByCode(configs, 'password_length'));
    const parsedDifferencePercent = parseInt(
        findValueByCode(configs, 'password_min_difference_percent')
    );

    return {
        passwordLength: parsedLength > 0 ? parsedLength : 6,
        passwordMinDifferencePercent: parsedDifferencePercent > 0 ? parsedDifferencePercent : 0,
        passwordCheckPersonalInfo: isEnabled(
            findValueByCode(configs, 'password_check_personal_info')
        ),
        passwordRequireUppercase: isEnabled(findValueByCode(configs, 'password_require_uppercase')),
        passwordRequireLowercase: isEnabled(findValueByCode(configs, 'password_require_lowercase')),
        passwordRequireNumber: isEnabled(findValueByCode(configs, 'password_require_number')),
        passwordRequireSpecialChar: isEnabled(
            findValueByCode(configs, 'password_require_special_char')
        )
    };
};

// True if the password satisfies all the complexity criteria enabled in
// the policy (criteria disabled in configuration are not checked)
export const passwordMeetsComplexity = (password: string, policy: PasswordPolicy): boolean => {
    if (policy.passwordRequireUppercase && !/[A-Z]/.test(password)) return false;
    if (policy.passwordRequireLowercase && !/[a-z]/.test(password)) return false;
    if (policy.passwordRequireNumber && !/\d/.test(password)) return false;
    if (
        policy.passwordRequireSpecialChar &&
        !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
        return false;
    }
    return true;
};

const levenshteinDistance = (a: string, b: string): number => {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const distances = Array.from({ length: rows }, (_, i) =>
        Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );

    for (let i = 1; i < rows; i++) {
        for (let j = 1; j < cols; j++) {
            const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
            distances[i][j] = Math.min(
                distances[i - 1][j] + 1,
                distances[i][j - 1] + 1,
                distances[i - 1][j - 1] + substitutionCost
            );
        }
    }
    return distances[a.length][b.length];
};

// Percentage of difference between two passwords (0-100), based on the
// edit distance relative to the longest password
export const passwordDifferencePercent = (oldPassword: string, newPassword: string): number => {
    const maxLength = Math.max(oldPassword.length, newPassword.length);
    if (maxLength === 0) return 100;
    return (levenshteinDistance(oldPassword, newPassword) / maxLength) * 100;
};

// True if the password contains one of the user's personal information
// (username, name, email local part...)
export const passwordContainsPersonalInfo = (
    password: string,
    personalInfos: (string | undefined | null)[]
): boolean => {
    const lowerPassword = password.toLowerCase();
    return personalInfos.some((info) => {
        if (!info) return false;
        const lowerInfo = info.toLowerCase();
        return lowerInfo.length >= 3 && lowerPassword.includes(lowerInfo);
    });
};

// True if the password contains a simple pattern: same character repeated
// 4+ times, ascending/descending sequence of 4+ characters (abcd, 4321...)
// or a common keyboard/dictionary sequence
export const passwordHasSimplePattern = (password: string): boolean => {
    const lowerPassword = password.toLowerCase();

    if (/(.)\1{3,}/.test(lowerPassword)) {
        return true;
    }

    for (let i = 0; i <= lowerPassword.length - 4; i++) {
        const codes = lowerPassword
            .slice(i, i + 4)
            .split('')
            .map((c) => c.charCodeAt(0));
        if (codes.every((code, j) => j === 0 || code - codes[j - 1] === 1)) return true;
        if (codes.every((code, j) => j === 0 || code - codes[j - 1] === -1)) return true;
    }

    return ['azerty', 'qwerty', 'password', 'motdepasse'].some((pattern) =>
        lowerPassword.includes(pattern)
    );
};
