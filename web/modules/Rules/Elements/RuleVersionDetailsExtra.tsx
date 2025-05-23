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
import { useEffect, useState } from 'react';
import { RuleVersionDetailInModelV2 as modelConfIn } from 'models/RuleVersionDetailInModelV2';
import { RuleVersionDetailOutModelV2 as modelConfOut } from 'models/RuleVersionDetailOutModelV2';
import { RuleVersionConfigListComponent } from './RuleVersionConfigListComponent';
import { RuleVersionListComponent } from './RuleVersionListComponent';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

export interface IItemDetailsProps {
    rule: any;
}

const RuleVersionDetailsExtra = ({ rule }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const { graphqlRequestClient } = useAuth();
    const [dataInConfig, setDataInConfig] = useState<any>(null);
    const [dataOutConfig, setDataOutConfig] = useState<any>(null);
    const [ruleConfigInToDelete, setRuleConfigInToDelete] = useState<any>(null);
    const [ruleConfigOutToDelete, setRuleConfigOutToDelete] = useState<any>(null);
    const [refetchInConfig, setRefetchInConfig] = useState(false);
    const [refetchOutConfig, setRefetchOutConfig] = useState(false);
    const [idToDeleteVersionConfig, setIdToDeleteVersionConfig] = useState<string | undefined>();
    const [idToDisableVersionConfig, setIdToDisableVersionConfig] = useState<string | undefined>();
    const modes = getModesFromPermissions(permissions, Table.RuleVersionConfig);

    const updateRuleVersionQuery = gql`
        mutation updateRuleVersion($id: String!, $input: UpdateRuleVersionInput!) {
            updateRuleVersion(id: $id, input: $input) {
                id
                ruleConfigurationIn
                ruleConfigurationOut
                ruleVersionConfigs {
                    id
                    order
                }
            }
        }
    `;

    const [priorityStatus, setPriorityStatus] = useState({
        id: '',
        type: ''
    });

    const confirmAction = (info: any | undefined, setInfo: any) => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: () => {
                    setInfo(info);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    useEffect(() => {
        const handleDeleteConfig = async () => {
            if (ruleConfigInToDelete || ruleConfigOutToDelete) {
                const configType = ruleConfigInToDelete ? 'In' : 'Out';
                let dataToUpdate: any[] = [];
                if (configType === 'In') {
                    dataToUpdate = dataInConfig.filter(
                        (item: any) => item !== ruleConfigInToDelete
                    );
                } else {
                    dataToUpdate = dataOutConfig.filter(
                        (item: any) => item !== ruleConfigOutToDelete
                    );
                }
                const dataToUpdateFormated = {
                    ...dataToUpdate.reduce((acc: any, item: any) => {
                        acc[item.parameterName] = {
                            description: item.description,
                            type: item.type,
                            validationRule: item.validationRule
                        };
                        return acc;
                    }, {})
                };
                const updateRuleVersionVariables = {
                    id: rule.id,
                    input: {
                        ['ruleConfiguration' + configType]: dataToUpdateFormated
                    }
                };
                // to avoid back security

                await graphqlRequestClient.request(updateRuleVersionQuery, {
                    id: rule.id,
                    input: {
                        ['ruleConfiguration' + configType]: null
                    }
                });
                graphqlRequestClient
                    .request(updateRuleVersionQuery, updateRuleVersionVariables)
                    .then((result: any) => {
                        if (result) {
                            if (result.updateRuleVersion) {
                                setDataInConfig(result.updateRuleVersion.ruleConfigurationIn);
                                setDataOutConfig(result.updateRuleVersion.ruleConfigurationOut);
                                setRuleConfigInToDelete(null);
                                setRuleConfigOutToDelete(null);
                                if (configType === 'In') {
                                    setRefetchInConfig((prev) => !prev);
                                }
                                if (configType === 'Out') {
                                    setRefetchOutConfig((prev) => !prev);
                                }
                            } else {
                                console.error('Error updating rule version');
                            }
                        }
                    });
            }
        };

        handleDeleteConfig();
    }, [ruleConfigInToDelete, ruleConfigOutToDelete]);

    const ruleVersionHeaderDataIn: HeaderData = {
        title: t('common:rule-configs-in'),
        routes: [],
        actionsComponent:
            rule.version !== rule.rule_activeVersion ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:rule-config-in') })}
                    path={pathParamsFromDictionary('/rules/config/add', {
                        rule: JSON.stringify(rule),
                        type: 'In'
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
            rule.version !== rule.rule_activeVersion ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:rule-config-out') })}
                    path={pathParamsFromDictionary('/rules/config/add', {
                        rule: JSON.stringify(rule),
                        type: 'Out'
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
            rule.version !== rule.rule_activeVersion ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:configuration') })}
                    path={pathParamsFromDictionary('/rules/version/config/add', {
                        rule: JSON.stringify(rule)
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
                        searchCriteria={{ id: rule.id }}
                        headerData={ruleVersionHeaderDataIn}
                        setData={setDataInConfig}
                        dataModel={modelConfIn}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        searchable={false}
                        actionColumns={
                            rule.version !== rule.rule_activeVersion
                                ? [
                                      {
                                          title: 'actions:actions',
                                          key: 'actions',
                                          render: (record: { id: string; order: number }) => (
                                              <Space>
                                                  {modes.length > 0 &&
                                                  modes.includes(ModeEnum.Update) ? (
                                                      <LinkButton
                                                          icon={<EditTwoTone />}
                                                          path={pathParamsFromDictionary(
                                                              '/rules/config/edit/:id'.replace(
                                                                  ':id',
                                                                  rule.id
                                                              ),
                                                              {
                                                                  rule: JSON.stringify(rule),
                                                                  data: JSON.stringify(record),
                                                                  type: 'In'
                                                              }
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
                                                                  record,
                                                                  setRuleConfigInToDelete
                                                              )()
                                                          }
                                                      ></Button>
                                                  ) : (
                                                      <></>
                                                  )}
                                              </Space>
                                          )
                                      }
                                  ]
                                : []
                        }
                        refetch={refetchInConfig}
                    />
                    {console.log('rule', rule)}
                    <RuleVersionListComponent
                        searchCriteria={{ id: rule.id }}
                        headerData={ruleVersionHeaderDataOut}
                        setData={setDataOutConfig}
                        dataModel={modelConfOut}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        searchable={false}
                        actionColumns={
                            rule.version !== rule.rule_activeVersion
                                ? [
                                      {
                                          title: 'actions:actions',
                                          key: 'actions',
                                          render: (record: { id: string; order: number }) => (
                                              <Space>
                                                  {modes.length > 0 &&
                                                  modes.includes(ModeEnum.Update) ? (
                                                      <LinkButton
                                                          icon={<EditTwoTone />}
                                                          path={pathParamsFromDictionary(
                                                              '/rules/config/edit/:id'.replace(
                                                                  ':id',
                                                                  rule.id
                                                              ),
                                                              {
                                                                  rule: JSON.stringify(rule),
                                                                  data: JSON.stringify(record),
                                                                  type: 'Out'
                                                              }
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
                                                                  record,
                                                                  setRuleConfigOutToDelete
                                                              )()
                                                          }
                                                      ></Button>
                                                  ) : (
                                                      <></>
                                                  )}
                                              </Space>
                                          )
                                      }
                                  ]
                                : []
                        }
                        refetch={refetchOutConfig}
                    />
                    <Divider />
                    <RuleVersionConfigListComponent
                        searchCriteria={{ ruleVersionId: rule.id }}
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
                                        {rule.version !== rule.rule_activeVersion ? (
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
