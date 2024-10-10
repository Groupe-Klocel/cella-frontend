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
import { cookie, isoLangs, LanguageType } from '@helpers';
import { Select } from 'antd';
import { useRouter } from 'next/router';
import { FC } from 'react';
import styled from 'styled-components';

const { Option } = Select;

const StyledSelect = styled(Select)`
    width: 40px;
    padding: 0px 5px 0px 5px;

    .ant-select-selector {
        border: none !important;
        background-color: transparent !important;
        padding: 0 !important;
    }

    .ant-select-selection-item {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 !important;
    }

    .ant-select-arrow {
        display: none;
    }
`;
const LanguageSelector: FC = () => {
    const router = useRouter();
    const { locale } = router;

    const changeLanguage = (value: any) => {
        const newLocale: string = value;
        cookie.set('NEXT_LOCALE', newLocale);
        router.push(router.asPath, router.asPath, { locale: newLocale });
    };

    return (
        <StyledSelect defaultValue={locale} onChange={changeLanguage}>
            {isoLangs.map((language: LanguageType) => (
                <Option key={language.code} value={language.code}>
                    <img src={language.flag} width={15} />
                </Option>
            ))}
        </StyledSelect>
    );
};

LanguageSelector.displayName = 'LanguageSelector';

export { LanguageSelector };
