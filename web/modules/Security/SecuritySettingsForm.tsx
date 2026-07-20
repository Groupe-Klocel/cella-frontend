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
import { InfoCircleOutlined } from '@ant-design/icons';
import { WrapperForm, ContentSpin } from '@components';
import { showError, showSuccess, PASSWORD_POLICY_CONFIG_SCOPE } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Checkbox, Col, Divider, InputNumber, Row, Space, Tooltip } from 'antd';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch } from 'context/AppContext';
import { gql } from 'graphql-request';
import { useCallback, useEffect, useState } from 'react';

const CONFIG_SCOPE = PASSWORD_POLICY_CONFIG_SCOPE;

interface SecuritySettingDefinition {
    code: string;
    labelKey: string;
    // translation key of the tooltip explaining the setting
    tooltipKey: string;
    section: 'rules' | 'complexity';
    // undefined = boolean setting (checkbox only), otherwise a value is expected
    input?: {
        min: number;
        max: number;
        defaultValue: number;
    };
}

// Password policy settings (ticket #34727)
const SETTINGS: SecuritySettingDefinition[] = [
    {
        code: 'password_length',
        labelKey: 'd:password-min-length',
        tooltipKey: 'd:password-min-length-tooltip',
        section: 'rules',
        input: { min: 1, max: 64, defaultValue: 12 }
    },
    {
        code: 'password_history_count',
        labelKey: 'd:password-history-count',
        tooltipKey: 'd:password-history-count-tooltip',
        section: 'rules',
        input: { min: 1, max: 24, defaultValue: 5 }
    },
    {
        code: 'password_min_difference_percent',
        labelKey: 'd:password-min-difference-percent',
        tooltipKey: 'd:password-min-difference-percent-tooltip',
        section: 'rules',
        input: { min: 1, max: 100, defaultValue: 50 }
    },
    {
        code: 'password_check_personal_info',
        labelKey: 'd:password-check-personal-info',
        tooltipKey: 'd:password-check-personal-info-tooltip',
        section: 'rules'
    },
    {
        code: 'password_expiration',
        labelKey: 'd:password-expiration',
        tooltipKey: 'd:password-expiration-tooltip',
        section: 'rules'
    },
    {
        code: 'password_max_login_attempts',
        labelKey: 'd:password-max-login-attempts',
        tooltipKey: 'd:password-max-login-attempts-tooltip',
        section: 'rules',
        input: { min: 1, max: 999, defaultValue: 50 }
    },
    {
        code: 'password_require_uppercase',
        labelKey: 'd:password-require-uppercase',
        tooltipKey: 'd:password-require-uppercase-tooltip',
        section: 'complexity'
    },
    {
        code: 'password_require_lowercase',
        labelKey: 'd:password-require-lowercase',
        tooltipKey: 'd:password-require-lowercase-tooltip',
        section: 'complexity'
    },
    {
        code: 'password_require_number',
        labelKey: 'd:password-require-number',
        tooltipKey: 'd:password-require-number-tooltip',
        section: 'complexity'
    },
    {
        code: 'password_require_special_char',
        labelKey: 'd:password-require-special-char',
        tooltipKey: 'd:password-require-special-char-tooltip',
        section: 'complexity'
    }
];

interface SecuritySettingState {
    id?: string;
    enabled: boolean;
    value: number;
}

const isEnabledValue = (value: string | undefined | null): boolean => {
    if (value === undefined || value === null) return false;
    const lowerValue = value.toLowerCase();
    return lowerValue !== '' && lowerValue !== '0' && lowerValue !== 'false' && lowerValue !== 'n';
};

export interface ISecuritySettingsFormProps {
    isEditable: boolean;
}

export const SecuritySettingsForm = ({ isEditable }: ISecuritySettingsFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const dispatch = useAppDispatch();

    const [settingsState, setSettingsState] = useState<{
        [code: string]: SecuritySettingState;
    } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const submitButton = t('actions:submit');

    const loadConfigs = useCallback(async () => {
        const query = gql`
            query GetSecurityConfigs($scope: [String!]) {
                configs(filters: { scope: $scope }, itemsPerPage: 100) {
                    results {
                        id
                        scope
                        code
                        value
                    }
                }
            }
        `;
        try {
            const queryInfo: any = await graphqlRequestClient.request(query, {
                scope: [CONFIG_SCOPE]
            });
            const configs = queryInfo.configs.results;
            const newState: { [code: string]: SecuritySettingState } = {};
            SETTINGS.forEach((setting) => {
                const config = configs.find(
                    (item: any) => item.code.toLowerCase() === setting.code.toLowerCase()
                );
                const parsedValue = config ? parseInt(config.value) : NaN;
                newState[setting.code] = {
                    id: config?.id,
                    enabled: isEnabledValue(config?.value),
                    value:
                        !isNaN(parsedValue) && parsedValue > 0
                            ? parsedValue
                            : (setting.input?.defaultValue ?? 1)
                };
            });
            setSettingsState(newState);
        } catch (error) {
            console.log('error', error);
            showError(t('messages:error-getting-data'));
        }
    }, [graphqlRequestClient, t]);

    useEffect(() => {
        loadConfigs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refresh the configs stored in the app state so that the new policy
    // is applied immediately by the forms consuming it
    const refreshAppStateConfigs = async () => {
        const query = gql`
            query {
                configs(filters: {}, itemsPerPage: 999999999) {
                    count
                    results {
                        id
                        translation
                        scope
                        code
                        value
                        system
                        extras
                    }
                }
            }
        `;
        try {
            const queryInfo: any = await graphqlRequestClient.request(query);
            dispatch({
                type: 'SET_CONFIGS',
                configs: queryInfo.configs.results
            });
        } catch (error) {
            console.log('error', error);
        }
    };

    const onSave = async () => {
        if (!settingsState) return;
        setIsSaving(true);

        const updateMutation = gql`
            mutation UpdateSecurityConfig($id: String!, $input: UpdateConfigInput!) {
                updateConfig(id: $id, input: $input) {
                    id
                    value
                }
            }
        `;
        const createMutation = gql`
            mutation CreateSecurityConfig($input: CreateConfigInput!) {
                createConfig(input: $input) {
                    id
                    scope
                    code
                    value
                }
            }
        `;

        try {
            for (const setting of SETTINGS) {
                const state = settingsState[setting.code];
                const targetValue = !state.enabled
                    ? '0'
                    : setting.input
                      ? String(state.value)
                      : '1';

                if (state.id) {
                    await graphqlRequestClient.request(updateMutation, {
                        id: state.id,
                        input: { value: targetValue }
                    });
                } else if (state.enabled) {
                    await graphqlRequestClient.request(createMutation, {
                        input: {
                            scope: CONFIG_SCOPE,
                            code: setting.code,
                            value: targetValue
                        }
                    });
                }
            }
            showSuccess(t('messages:success-updated'));
            await refreshAppStateConfigs();
            await loadConfigs();
        } catch (error) {
            console.log('error', error);
            showError(t('messages:error-update-data'));
        }
        setIsSaving(false);
    };

    if (!settingsState) {
        return <ContentSpin />;
    }

    const renderSetting = (setting: SecuritySettingDefinition) => {
        const state = settingsState[setting.code];
        return (
            <Row key={setting.code} align="middle" gutter={16}>
                <Col span={12}>
                    <Checkbox
                        disabled={!isEditable}
                        checked={state.enabled}
                        onChange={(e) =>
                            setSettingsState({
                                ...settingsState,
                                [setting.code]: {
                                    ...state,
                                    enabled: e.target.checked
                                }
                            })
                        }
                    >
                        {t(setting.labelKey)}
                        <Tooltip title={t(setting.tooltipKey)}>
                            <InfoCircleOutlined
                                style={{ marginLeft: 8, color: 'rgba(0, 0, 0, 0.45)' }}
                            />
                        </Tooltip>
                    </Checkbox>
                </Col>
                <Col span={6}>
                    {setting.input ? (
                        <InputNumber
                            disabled={!isEditable || !state.enabled}
                            min={setting.input.min}
                            max={setting.input.max}
                            precision={0}
                            value={state.value}
                            onChange={(newValue) =>
                                setSettingsState({
                                    ...settingsState,
                                    [setting.code]: {
                                        ...state,
                                        value: newValue ?? setting.input!.defaultValue
                                    }
                                })
                            }
                        />
                    ) : (
                        <></>
                    )}
                </Col>
            </Row>
        );
    };

    return (
        <WrapperForm>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Divider orientation="left">{t('common:password-rules')}</Divider>
                {SETTINGS.filter((setting) => setting.section === 'rules').map(renderSetting)}
                <Divider orientation="left">{t('common:password-complexity')}</Divider>
                {SETTINGS.filter((setting) => setting.section === 'complexity').map(renderSetting)}
                {isEditable ? (
                    <Row justify="center">
                        <Button type="primary" loading={isSaving} onClick={onSave}>
                            {submitButton}
                        </Button>
                    </Row>
                ) : (
                    <></>
                )}
            </Space>
        </WrapperForm>
    );
};
