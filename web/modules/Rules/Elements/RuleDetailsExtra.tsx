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
import { LinkButton } from '@components';
import { DeleteOutlined, EditTwoTone, EyeTwoTone, StopOutlined } from '@ant-design/icons';
import { getModesFromPermissions, pathParamsFromDictionary } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Divider, Modal, Space } from 'antd';
import 'moment/min/locales';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { RuleVersionModelV2 } from 'models/RuleVersionModelV2';
import { useState } from 'react';

export interface IItemDetailsProps {
    ruleId?: string | any;
    ruleName?: string | any;
}

const RuleDetailsExtra = ({ ruleId, ruleName }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const [idToDeleteVersion, setIdToDeleteVersion] = useState<string | undefined>();
    const [idToDisableVersion, setIdToDisableVersion] = useState<string | undefined>();
    const ruleVersionModes = getModesFromPermissions(permissions, Table.RuleVersion);
    const [, setRuleVersionsData] = useState<any>();

    const confirmAction = (id: string | undefined, setId: any) => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const ruleVersionHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:rule-versions') }),
        routes: [],
        actionsComponent:
            ruleVersionModes.length > 0 && ruleVersionModes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:rule-version') })}
                    path={pathParamsFromDictionary('/rules/version/add', {
                        ruleId: ruleId,
                        ruleName: ruleName
                    })}
                    type="primary"
                />
            ) : null
    };

    return (
        <>
            {ruleVersionModes.length > 0 && ruleVersionModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ ruleId: ruleId }}
                        dataModel={RuleVersionModelV2}
                        headerData={ruleVersionHeaderData}
                        triggerDelete={{
                            idToDelete: idToDeleteVersion,
                            setIdToDelete: setIdToDeleteVersion
                        }}
                        triggerSoftDelete={{
                            idToDisable: idToDisableVersion,
                            setIdToDisable: setIdToDisableVersion
                        }}
                        routeDetailPage={'/rules/detail/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string }) => (
                                    <Space>
                                        {ruleVersionModes.length == 0 ||
                                        !ruleVersionModes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={pathParamsFromDictionary(
                                                        '/rules/version/[id]',
                                                        {
                                                            id: record.id
                                                        }
                                                    )}
                                                />
                                            </>
                                        )}
                                        {ruleVersionModes.length > 0 &&
                                        ruleVersionModes.includes(ModeEnum.Update) &&
                                        RuleVersionModelV2.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/rules/version/edit/[id]',
                                                    {
                                                        id: record.id,
                                                        ruleId,
                                                        ruleName
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {ruleVersionModes.length > 0 &&
                                        ruleVersionModes.includes(ModeEnum.Delete) &&
                                        RuleVersionModelV2.isSoftDeletable ? (
                                            <Button
                                                icon={<StopOutlined />}
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDisableVersion
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                        {ruleVersionModes.length > 0 &&
                                        ruleVersionModes.includes(ModeEnum.Delete) &&
                                        RuleVersionModelV2.isDeletable ? (
                                            <Button
                                                icon={<DeleteOutlined />}
                                                danger
                                                onClick={() =>
                                                    confirmAction(record.id, setIdToDeleteVersion)()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                        searchable={false}
                        setData={setRuleVersionsData}
                        sortDefault={[{ field: 'created', ascending: true }]}
                    />
                    <Divider />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { RuleDetailsExtra };
