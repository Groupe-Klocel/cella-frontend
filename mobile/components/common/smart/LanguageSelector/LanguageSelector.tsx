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
import {
    isoLangs,
    LanguageType,
    showError,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { useAppState, useAppDispatch } from 'context/AppContext';
import { Select } from 'antd';
import { useRouter } from 'next/router';
import React, { FC } from 'react';
import styled from 'styled-components';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

const { Option } = Select;

const SETTING_CODE = 'globalParametersMobile';

const FIND_SETTING = gql`
    query ($warehouseWorkerId: String!) {
        warehouseWorkerSettings(
            filters: { warehouseWorkerId: $warehouseWorkerId, code: "globalParametersMobile" }
        ) {
            results {
                id
                code
                valueJson
            }
        }
    }
`;

const CREATE_SETTING = gql`
    mutation ($input: CreateWarehouseWorkerSettingInput!) {
        createWarehouseWorkerSetting(input: $input) {
            id
            code
            valueJson
        }
    }
`;

const UPDATE_SETTING = gql`
    mutation ($id: String!, $input: UpdateWarehouseWorkerSettingInput!) {
        updateWarehouseWorkerSetting(id: $id, input: $input) {
            id
            code
            valueJson
        }
    }
`;

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
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();

    const { userSettings, user: userInfo } = useAppState();

    const dispatchUserSettings = useAppDispatch();

    const generalUserSettings = userSettings?.find((item: any) => {
        return SETTING_CODE === item.code;
    });

    const saveSettings = async (lang: any) => {
        try {
            // A user has at most one RF row: creating a second one fails (DB-000112). When the
            // state does not know its id (the boot fetch failed, or has not returned yet), the row
            // may still exist, so look it up before creating it.
            let stored: any = generalUserSettings?.id ? generalUserSettings : undefined;
            if (!stored) {
                const found: any = await graphqlRequestClient.request(FIND_SETTING, {
                    warehouseWorkerId: userInfo.id
                });
                stored = found?.warehouseWorkerSettings?.results?.[0];
            }
            // only the language changes: the theme and any other key keep their stored value
            const valueJson = { ...(stored ?? generalUserSettings)?.valueJson, lang };

            let saved: any;
            if (stored?.id) {
                const updated: any = await graphqlRequestClient.request(UPDATE_SETTING, {
                    id: stored.id,
                    input: { valueJson }
                });
                saved = updated.updateWarehouseWorkerSetting;
            } else {
                const created: any = await graphqlRequestClient.request(CREATE_SETTING, {
                    input: { code: SETTING_CODE, warehouseWorkerId: userInfo.id, valueJson }
                });
                saved = created.createWarehouseWorkerSetting;
            }

            dispatchUserSettings({
                type: 'SWITCH_USER_SETTINGS',
                userSettings: [
                    ...(userSettings ?? []).filter((item: any) => item.code !== SETTING_CODE),
                    saved
                ]
            });
            router.push(router.asPath, router.asPath, { locale: lang });
        } catch (error) {
            // the flag stays on the current language: say so instead of failing silently
            console.error('LanguageSelector: could not save the language', error);
            showError(t('messages:error-updating-data'));
        }
    };

    return (
        <StyledSelect
            value={generalUserSettings?.valueJson?.lang ?? router.locale}
            onChange={saveSettings}
        >
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
