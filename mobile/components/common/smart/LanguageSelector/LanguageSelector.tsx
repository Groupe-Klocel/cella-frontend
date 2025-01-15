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
import { useAppState, useAppDispatch } from 'context/AppContext';
import { Select } from 'antd';
import { useRouter } from 'next/router';
import React, { FC, useCallback, useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

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
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    const { userSettings, user: userInfo } = useAppState();

    const dispatchUserSettings = useAppDispatch();

    const generalUserSettings = userSettings?.find((item: any) => {
        return 'globalParametersMobile' === item.code;
    });

    const createUsersSettings = useCallback(
        async (lang: any) => {
            const newsSettings = {
                code: 'globalParametersMobile',
                warehouseWorkerId: userInfo.id,
                valueJson: {
                    lang: lang,
                    theme: generalUserSettings?.valueJson?.theme
                }
            };
            const createQuery = gql`
                mutation ($input: CreateWarehouseWorkerSettingInput!) {
                    createWarehouseWorkerSetting(input: $input) {
                        id
                        code
                        valueJson
                    }
                }
            `;
            const userSettingsQuery = await graphqlRequestClient.request(createQuery, {
                input: newsSettings
            });
            dispatchUserSettings({
                type: 'SWITCH_USER_SETTINGS',
                userSettings: [...userSettings, userSettingsQuery.createWarehouseWorkerSetting]
            });
            router.push(router.asPath, router.asPath, { locale: lang });
        },
        [graphqlRequestClient, userInfo]
    );
    const updateUsersSettings = async (lang: any) => {
        const newsSettings = {
            ...generalUserSettings,
            valueJson: {
                lang: lang,
                theme: generalUserSettings?.valueJson?.theme
            }
        };
        const updateQuery = gql`
            mutation ($id: String!, $input: UpdateWarehouseWorkerSettingInput!) {
                updateWarehouseWorkerSetting(id: $id, input: $input) {
                    id
                    code
                    valueJson
                }
            }
        `;
        const userSettingsQuery = await graphqlRequestClient.request(updateQuery, {
            id: generalUserSettings?.id,
            input: { valueJson: newsSettings.valueJson }
        });
        dispatchUserSettings({
            type: 'SWITCH_USER_SETTINGS',
            userSettings: userSettings.map((item: any) =>
                item.code === 'globalParametersMobile'
                    ? userSettingsQuery.updateWarehouseWorkerSetting
                    : item
            )
        });
        router.push(router.asPath, router.asPath, { locale: lang });
    };

    const saveSettings = (lang: any) => {
        if (generalUserSettings?.id) {
            updateUsersSettings(lang);
        } else {
            createUsersSettings(lang);
        }
    };

    return (
        <StyledSelect
            value={generalUserSettings?.valueJson?.lang}
            // defaultValue={generalUserSettingsRef.current?.valueJson?.lang ?? router.locale}
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
