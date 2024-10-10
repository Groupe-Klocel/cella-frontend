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
import { isoLangs, LanguageType } from '@helpers';
import { Select } from 'antd';
import { useRouter } from 'next/router';
import { FC, useCallback } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';
import styled from 'styled-components';

const { Option } = Select;

const StyledSelect = styled(Select)`
    width: 120px;
    padding: 0px 5px 0px 5px;
`;
const LanguageSelector: FC = () => {
    const router = useRouter();
    const { locale } = router;

    const { globalLocale } = useAppState();

    const dispatchLocale = useAppDispatch();

    const changeLanguage = (value: any) => {
        const newLocale: string = value;
        selectLocaleSetting(newLocale);
        router.push(router.asPath, router.asPath, { locale: newLocale });
    };

    const selectLocaleSetting = useCallback(
        (newLocale: any) =>
            dispatchLocale({
                type: 'SWITCH_LOCALE',
                globalLocale: newLocale
            }),
        [dispatchLocale, globalLocale]
    );

    return (
        <StyledSelect defaultValue={locale} variant="borderless" onChange={changeLanguage}>
            {isoLangs.map((language: LanguageType) => (
                <Option key={language.code} value={language.code}>
                    {language.name}
                </Option>
            ))}
        </StyledSelect>
    );
};

LanguageSelector.displayName = 'LanguageSelector';

export { LanguageSelector };
