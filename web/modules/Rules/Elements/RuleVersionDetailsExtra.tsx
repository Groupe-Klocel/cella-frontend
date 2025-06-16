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
import { LinkButton, UsualButton } from '@components';
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
import { useEffect, useState, useMemo } from 'react';
import { RuleVersionDetailInModelV2 as modelConfIn } from 'models/RuleVersionDetailInModelV2';
import { RuleVersionDetailOutModelV2 as modelConfOut } from 'models/RuleVersionDetailOutModelV2';
import { RuleVersionConfigListComponent } from './RuleVersionConfigListComponent';
import { RuleVersionListComponent } from './RuleVersionListComponent';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

export interface IItemDetailsProps {
    rule: any;
    setRefetchRuleVersion?: any;
}

const RuleVersionDetailsExtra = ({ rule, setRefetchRuleVersion }: IItemDetailsProps) => {
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
    const disabled = rule.ruleVersionConfigs_ruleVersionId ? true : false;
    const tooltip = rule.ruleVersionConfigs_ruleVersionId
        ? t('messages:disable-existing-configuration')
        : '';

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
    const [RuleVersionConfigData, setRuleVersionConfigData] = useState<any>([]);

    const [priorityStatus, setPriorityStatus] = useState({
        id: null as string | null,
        newOrder: null as number | null
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
                    disabled={disabled}
                    tooltip={tooltip}
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
                    disabled={disabled}
                    tooltip={tooltip}
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

    const actionColumnsIn =
        rule.version !== rule.rule_activeVersion
            ? [
                  {
                      title: 'actions:actions',
                      key: 'actions',
                      render: (record: { id: string; order: number }) => (
                          <Space>
                              {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                                  <LinkButton
                                      icon={<EditTwoTone />}
                                      path={pathParamsFromDictionary(
                                          '/rules/config/edit/:id'.replace(':id', rule.id),
                                          {
                                              rule: JSON.stringify(rule),
                                              data: JSON.stringify(record),
                                              type: 'In'
                                          }
                                      )}
                                      disabled={disabled}
                                      tooltip={tooltip}
                                  />
                              ) : null}
                              {modes.length > 0 && modes.includes(ModeEnum.Delete) ? (
                                  <UsualButton
                                      icon={<DeleteOutlined />}
                                      danger
                                      onClick={() =>
                                          confirmAction(record, setRuleConfigInToDelete)()
                                      }
                                      disabled={disabled}
                                      tooltip={tooltip}
                                  />
                              ) : null}
                          </Space>
                      )
                  }
              ]
            : [];

    const actionColumnsOut =
        rule.version !== rule.rule_activeVersion
            ? [
                  {
                      title: 'actions:actions',
                      key: 'actions',
                      render: (record: { id: string; order: number }) => (
                          <Space>
                              {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                                  <LinkButton
                                      icon={<EditTwoTone />}
                                      path={pathParamsFromDictionary(
                                          '/rules/config/edit/:id'.replace(':id', rule.id),
                                          {
                                              rule: JSON.stringify(rule),
                                              data: JSON.stringify(record),
                                              type: 'Out'
                                          }
                                      )}
                                      disabled={disabled}
                                      tooltip={tooltip}
                                  />
                              ) : null}
                              {modes.length > 0 && modes.includes(ModeEnum.Delete) ? (
                                  <UsualButton
                                      icon={<DeleteOutlined />}
                                      danger
                                      onClick={() =>
                                          confirmAction(record, setRuleConfigOutToDelete)()
                                      }
                                      disabled={disabled}
                                      tooltip={tooltip}
                                  />
                              ) : null}
                          </Space>
                      )
                  }
              ]
            : [];

    const actionCollumnsconfig = [
        (rule.version !== rule.rule_activeVersion
            ? {
                  title: 'actions:actions',
                  key: 'actions',
                  render: (record: { id: string; order: number }) => (
                      <Space>
                          <Button
                              onClick={() => {
                                  if (priorityStatus.id === null) {
                                      setPriorityStatus({
                                          newOrder: record.order - 1,
                                          id: record.id
                                      });
                                  }
                              }}
                              disabled={record.order === 1}
                              loading={priorityStatus.id !== null && record.order !== 1}
                              icon={<CaretUpOutlined />}
                          />
                          <Button
                              onClick={() => {
                                  if (priorityStatus.id === null) {
                                      setPriorityStatus({
                                          newOrder: record.order + 1,
                                          id: record.id
                                      });
                                  }
                              }}
                              disabled={RuleVersionConfigData[0].listDataCount === record.order}
                              loading={
                                  priorityStatus.id !== null &&
                                  RuleVersionConfigData[0].listDataCount !== record.order
                              }
                              icon={<CaretDownOutlined />}
                          />
                          {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                              <LinkButton
                                  icon={<EditTwoTone />}
                                  path={'/rules/version/config/edit/:id'.replace(':id', record.id)}
                              />
                          ) : null}
                          {modes.length > 0 && modes.includes(ModeEnum.Delete) ? (
                              <Button
                                  icon={<DeleteOutlined />}
                                  danger
                                  onClick={() =>
                                      confirmAction(record.id, setIdToDeleteVersionConfig)()
                                  }
                              ></Button>
                          ) : null}
                      </Space>
                  )
              }
            : []) as any
    ];

    return (
        <>
            {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <RuleVersionListComponent
                        key={(disabled ? 'disabled' : 'enabled') + 'In'}
                        searchCriteria={{ id: rule.id }}
                        headerData={ruleVersionHeaderDataIn}
                        setData={setDataInConfig}
                        dataModel={modelConfIn}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        searchable={false}
                        actionColumns={actionColumnsIn}
                        refetch={refetchInConfig}
                    />
                    <RuleVersionListComponent
                        key={(disabled ? 'disabled' : 'enabled') + 'out'}
                        searchCriteria={{ id: rule.id }}
                        headerData={ruleVersionHeaderDataOut}
                        setData={setDataOutConfig}
                        dataModel={modelConfOut}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        searchable={false}
                        actionColumns={actionColumnsOut}
                        refetch={refetchOutConfig}
                    />
                    <Divider />
                    <RuleVersionConfigListComponent
                        searchCriteria={{ ruleVersionId: rule.id }}
                        headerData={ruleVersionLineConfigHeaderData}
                        setRefetchRuleVersion={setRefetchRuleVersion}
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
                            newOrder: priorityStatus.newOrder,
                            orderingField: 'order',
                            parentId: 'ruleVersionId'
                        }}
                        actionColumns={actionCollumnsconfig}
                        setData={setRuleVersionConfigData}
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
