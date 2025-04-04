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
import {
    CaretDownOutlined,
    CaretUpOutlined,
    DeleteOutlined,
    EditTwoTone,
    EyeTwoTone
} from '@ant-design/icons';
import { getModesFromPermissions, pathParamsFromDictionary } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Divider, Modal, Space } from 'antd';
import 'moment/min/locales';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData } from 'modules/Crud/ListComponentV2';
import { RuleVersionConfigDetailModelV2 as modelLineConf } from 'models/RuleVersionConfigDetailModelV2';
import { useState } from 'react';
import { RuleVersionDetailInModelV2 as modelConfIn } from 'models/RuleVersionDetailInModelV2';
import { RuleVersionDetailOutModelV2 as modelConfOut } from 'models/RuleVersionDetailOutModelV2';
import { RuleVersionConfigListComponent } from './RuleVersionConfigListComponent';
import { RuleVersionListComponent } from './RuleVersionListComponent';

export interface IItemDetailsProps {
    ruleVersionId?: string | any;
    ruleVersion?: number | any;
    ruleName?: string | any;
    ruleActiveVersion?: number | any;
    ruleId?: string | any;
}

const RuleVersionDetailsExtra = ({
    ruleVersionId,
    ruleVersion,
    ruleName,
    ruleActiveVersion,
    ruleId
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const [idToDeleteVersionConfig, setIdToDeleteVersionConfig] = useState<string | undefined>();
    const [idToDisableVersionConfig, setIdToDisableVersionConfig] = useState<string | undefined>();
    const modes = getModesFromPermissions(permissions, Table.RuleVersionConfig);

    const [priorityStatus, setPriorityStatus] = useState({
        id: '',
        type: ''
    });

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

    const ruleVersionHeaderDataIn: HeaderData = {
        title: t('common:rule-configs-in'),
        routes: [],
        actionsComponent:
            ruleVersion !== ruleActiveVersion ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:rule-config-in') })}
                    path={pathParamsFromDictionary('/rules/config-in/add', {
                        ruleVersionId: ruleVersionId,
                        ruleVersion: ruleVersion,
                        ruleName: ruleName,
                        ruleId: ruleId
                    })}
                    type="primary"
                />
            ) : (
                <></>
            )
    };

    const ruleVersionHeaderDataOut: HeaderData = {
        title: t('common:rule-configs-out'),
        routes: [],
        actionsComponent:
            ruleVersion !== ruleActiveVersion ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:rule-config-out') })}
                    path={pathParamsFromDictionary('/rules/config-out/add', {
                        ruleVersionId: ruleVersionId,
                        ruleVersion: ruleVersion,
                        ruleName: ruleName,
                        ruleId: ruleId
                    })}
                    type="primary"
                />
            ) : (
                <></>
            )
    };

    const ruleVersionLineConfigHeaderData: HeaderData = {
        title: t('common:configuration'),
        routes: [],
        actionsComponent:
            ruleVersion !== ruleActiveVersion ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:configuration') })}
                    path={pathParamsFromDictionary('/rules/version/config/add', {
                        ruleVersionId: ruleVersionId,
                        ruleVersion: ruleVersion,
                        ruleName: ruleName,
                        ruleId: ruleId
                    })}
                    type="primary"
                />
            ) : (
                <></>
            )
    };

    return (
        <>
            {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <RuleVersionListComponent
                        searchCriteria={{ id: ruleVersionId }}
                        headerData={ruleVersionHeaderDataIn}
                        dataModel={modelConfIn}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        searchable={false}
                    />
                    <RuleVersionListComponent
                        searchCriteria={{ id: ruleVersionId }}
                        headerData={ruleVersionHeaderDataOut}
                        dataModel={modelConfOut}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        searchable={false}
                    />
                    <Divider />
                    <RuleVersionConfigListComponent
                        searchCriteria={{ ruleVersionId: ruleVersionId }}
                        headerData={ruleVersionLineConfigHeaderData}
                        dataModel={modelLineConf}
                        searchable={false}
                        triggerDelete={{
                            idToDeleteVersionConfig: idToDeleteVersionConfig,
                            setIdToDeleteVersionConfig: setIdToDeleteVersionConfig
                        }}
                        triggerSoftDelete={{
                            idToDisableVersionConfig: idToDisableVersionConfig,
                            setIdToDisableVersionConfig: setIdToDisableVersionConfig
                        }}
                        triggerPriorityChange={{
                            id: priorityStatus.id,
                            setId: setPriorityStatus,
                            type: priorityStatus.type,
                            orderingField: 'order'
                        }}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string; order: number }) => (
                                    <Space>
                                        {modes.length == 0 || !modes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={'/rules/version/config/:id'.replace(
                                                        ':id',
                                                        record.id
                                                    )}
                                                />
                                            </>
                                        )}
                                        {ruleVersion !== ruleActiveVersion ? (
                                            <>
                                                <Button
                                                    onClick={() =>
                                                        setPriorityStatus({
                                                            type: 'up',
                                                            id: record.id
                                                        })
                                                    }
                                                    icon={<CaretUpOutlined />}
                                                />
                                                <Button
                                                    onClick={() =>
                                                        setPriorityStatus({
                                                            type: 'down',
                                                            id: record.id
                                                        })
                                                    }
                                                    icon={<CaretDownOutlined />}
                                                />
                                                {modes.length > 0 &&
                                                modes.includes(ModeEnum.Update) ? (
                                                    <LinkButton
                                                        icon={<EditTwoTone />}
                                                        path={'/rules/version/config/edit/:id'.replace(
                                                            ':id',
                                                            record.id
                                                        )}
                                                    />
                                                ) : (
                                                    <></>
                                                )}
                                                {modes.length > 0 &&
                                                modes.includes(ModeEnum.Delete) ? (
                                                    <Button
                                                        icon={<DeleteOutlined />}
                                                        danger
                                                        onClick={() =>
                                                            confirmAction(
                                                                record.id,
                                                                setIdToDeleteVersionConfig
                                                            )()
                                                        }
                                                    ></Button>
                                                ) : (
                                                    <></>
                                                )}
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                    />
                    <Divider />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { RuleVersionDetailsExtra };
