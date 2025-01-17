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
import { Row, Col, Divider, Select, Switch, Button, Modal } from 'antd';
import { useRouter } from 'next/router';
import { FC, useCallback, useState, useEffect } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import styled from 'styled-components';
import { gql } from 'graphql-request';

const { Option } = Select;

const StyledSelect = styled(Select)`
    width: 120px;
    padding: 0px 5px 0px 5px;
`;

const StyledSwitch = styled(Switch)`
    &.ant-switch .ant-switch-inner {
        padding-inline-start: 0 !important;
        padding-inline-end: 0 !important;
    }
`;

const LightThemeIcon = () => (
    <span role="img" aria-label="light">
        🌔
    </span>
);
const DarkThemeIcon = () => (
    <span role="img" aria-label="dark">
        🌘
    </span>
);

export const UserSettings: FC = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { locale } = router;
    const { graphqlRequestClient } = useAuth();

    const { userSettings, tempTheme } = useAppState();
    const dispatchUserSettings = useAppDispatch();

    const generalUserSettings = userSettings?.find((item: any) => {
        return 'globalParameters' === item.code;
    });

    const isSettingMenuCollapsed = generalUserSettings?.valueJson?.isSettingMenuCollapsed;
    const theme = tempTheme ?? generalUserSettings?.valueJson?.theme;

    const [isModalVisible, setIsModalVisible] = useState(false);

    const ResetUserConfigs = useCallback(async () => {
        const arrayOfIds = userSettings
            .map((item: any) => item.id)
            .filter(Boolean)
            .filter((id: any, index: number, self: any) => self.indexOf(id) === index);
        if (arrayOfIds.length === 0) {
            return setIsModalVisible(false);
        }
        const deleteQuery = gql`
            mutation ($ids: [String!]!) {
                deleteWarehouseWorkerSettings(ids: $ids)
            }
        `;
        const deleteVariables = {
            ids: arrayOfIds
        };
        await graphqlRequestClient.request(deleteQuery, deleteVariables);
        dispatchUserSettings({
            type: 'SWITCH_USER_SETTINGS',
            userSettings: [
                {
                    code: 'globalParameters',
                    valueJson: { lang: 'fr', isSettingMenuCollapsed: true, theme: 'light' }
                }
            ]
        });
        setIsModalVisible(false);
        router.reload();
    }, [userSettings, graphqlRequestClient]);

    const updateGeneralSettings = useCallback(
        (newSettings: any) =>
            dispatchUserSettings({
                type: 'SWITCH_USER_SETTINGS',
                userSettings: userSettings.map((item: any) => {
                    if ('globalParameters' === item.code) {
                        return {
                            ...item,
                            valueJson: {
                                ...item.valueJson,
                                ...newSettings
                            }
                        };
                    }
                    return item;
                })
            }),
        [dispatchUserSettings, userSettings]
    );

    const changeLanguage = useCallback(
        (value: any) => {
            const newLocale: string = value;
            updateGeneralSettings({ lang: newLocale });
            router.push(router.asPath, router.asPath, { locale: newLocale });
        },
        [router, updateGeneralSettings]
    );

    const toggleMenuCollapse = useCallback(
        (checked: boolean) => {
            updateGeneralSettings({ isSettingMenuCollapsed: checked });
        },
        [updateGeneralSettings]
    );

    const switchTheme = useCallback(
        (checked: boolean) => {
            const newTheme = checked ? 'dark' : 'light';
            dispatchUserSettings({
                type: 'SWITCH_TEMP_THEME',
                tempTheme: newTheme
            });
        },
        [updateGeneralSettings, dispatchUserSettings]
    );

    return (
        <>
            <Divider orientation="left"></Divider>
            <Row justify="space-between">
                <Col>{t('common:language')}</Col>
                <Col>
                    <StyledSelect
                        defaultValue={locale}
                        variant="borderless"
                        onChange={changeLanguage}
                    >
                        {isoLangs.map((language: LanguageType) => (
                            <Option key={language.code} value={language.code}>
                                {language.name}
                            </Option>
                        ))}
                    </StyledSelect>
                </Col>
            </Row>
            <Divider orientation="left">{t('common:menu')}</Divider>
            <Row justify="space-between">
                <Col>{t('actions:collapse-menu')}</Col>
                <Col>
                    <StyledSwitch
                        checked={isSettingMenuCollapsed}
                        onChange={toggleMenuCollapse}
                        defaultChecked
                    />
                </Col>
            </Row>
            <Divider orientation="left">{t('common:theme-settings')}</Divider>
            <Row justify="space-between">
                <Col>{t('actions:dark-mode')}</Col>
                <Col>
                    <StyledSwitch
                        checked={theme === 'dark'}
                        onChange={switchTheme}
                        checkedChildren={<LightThemeIcon />}
                        unCheckedChildren={<DarkThemeIcon />}
                    />
                </Col>
            </Row>
            <Divider orientation="left">{t('common:reset-settings')}</Divider>
            <Row justify="center">
                <Button type="primary" danger onClick={() => setIsModalVisible(true)}>
                    {t('actions:reset-settings')}
                </Button>
            </Row>
            <Modal
                title={t('common:confirm-reset')}
                open={isModalVisible}
                onOk={ResetUserConfigs}
                onCancel={() => setIsModalVisible(false)}
                okText={t('actions:confirm')}
                cancelText={t('actions:cancel')}
            >
                <p>{t('common:reset-warning')}</p>
            </Modal>
        </>
    );
};
