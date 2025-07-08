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
import { AppHead, LinkButton } from '@components';
import { DeleteOutlined, EditTwoTone, EyeTwoTone, LockTwoTone } from '@ant-design/icons';
import {
    pathParams,
    META_DEFAULTS,
    getModesFromPermissions,
    pathParamsFromDictionary,
    showError,
    formatFeatures
} from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Divider, Modal, Space } from 'antd';
import { useEffect, useState } from 'react';
import { ModeEnum } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { handlingUnitContentsSubRoutes as itemRoutes } from 'modules/HandlingUnits/Static/handlingUnitContentsRoutes';
import { useAppState } from 'context/AppContext';
import { HandlingUnitContentFeatureModelV2 as model } from 'models/HandlingUnitContentFeatureModelV2';
import parameters from '../../../../common/parameters.json';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

export interface IItemDetailsProps {
    handlingUnitContentId?: string | any;
    handlingUnitName?: string | any;
    articleName?: string | any;
    quantity?: Number | any;
    handlingUnit_category?: Number | any;
    articleFeatureType?: Number | any;
    setRefetch?: any;
}

const HandlingUnitContentDetailsExtra = ({
    handlingUnitContentId,
    handlingUnitName,
    articleName,
    quantity,
    handlingUnit_category,
    articleFeatureType,
    setRefetch
}: IItemDetailsProps) => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    let rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    rootPath += '/feature';
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [successDeleteResult, setSuccessDeleteResult] = useState<any>();
    const [originContentData, setOriginContentData] = useState<any>();
    const [currentHucfs, setCurrentHucfs] = useState<any[]>([]);

    const { graphqlRequestClient } = useAuth();

    const headerData: HeaderData = {
        title: t('common:content-features'),
        routes: [],
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) && articleFeatureType ? (
                <LinkButton
                    title={t('actions:add2', {
                        name: t('common:content-feature')
                    })}
                    path={pathParamsFromDictionary('/handling-unit-contents/feature/add', {
                        handlingUnitContentId: handlingUnitContentId,
                        handlingUnitName: handlingUnitName,
                        articleName: articleName,
                        quantity: quantity,
                        featureType: articleFeatureType
                    })}
                    type="primary"
                />
            ) : null
    };

    const confirmAction = (
        id: string | undefined,
        setId: any,
        action: 'delete' | 'disable',
        originData: any
    ) => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: () => {
                    setId(id);
                    setOriginContentData(originData);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const hucQuery = gql`
        query handlingUnitContent($id: String!) {
            handlingUnitContent(id: $id) {
                id
                quantity
                handlingUnitContentFeatures {
                    featureCode {
                        name
                    }
                    id
                    value
                }
            }
        }
    `;

    const executeFunctionQuery = gql`
        mutation executeFunction($functionName: String!, $event: JSON!) {
            executeFunction(functionName: $functionName, event: $event) {
                status
                output
            }
        }
    `;

    useEffect(() => {
        if (successDeleteResult) {
            const movementProcess = async () => {
                const hucVariables = {
                    id: handlingUnitContentId
                };
                const result = await graphqlRequestClient.request(hucQuery, hucVariables);
                if (result) {
                    const updatedHuc = result.handlingUnitContent;
                    if (originContentData && originContentData.quantity !== updatedHuc.quantity) {
                        originContentData.features = formatFeatures(currentHucfs);
                        // Create a movement
                        const executeFunctionVariables = {
                            functionName: 'create_movements',
                            event: {
                                input: {
                                    content: originContentData,
                                    data: {
                                        quantity: updatedHuc.quantity,
                                        finalFeatures: formatFeatures(
                                            updatedHuc.handlingUnitContentFeatures
                                        )
                                    },
                                    type: 'update',
                                    lastTransactionId: successDeleteResult.transactionId
                                }
                            }
                        };
                        const executeFunctionResult = await graphqlRequestClient.request(
                            executeFunctionQuery,
                            executeFunctionVariables
                        );
                        if (executeFunctionResult.executeFunction.status === 'ERROR') {
                            showError(executeFunctionResult.executeFunction.output);
                        } else if (
                            executeFunctionResult.executeFunction.status === 'OK' &&
                            executeFunctionResult.executeFunction.output.status === 'KO'
                        ) {
                            showError(
                                t(
                                    `errors:${executeFunctionResult.executeFunction.output.output.code}`
                                )
                            );
                            console.log(
                                'Backend_message',
                                executeFunctionResult.executeFunction.output.output
                            );
                        }
                        setRefetch((prev: boolean) => !prev);
                    }
                }
            };
            movementProcess();
            setSuccessDeleteResult(undefined);
        }
    }, [successDeleteResult]);

    return (
        <>
            <Divider />
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                searchCriteria={{ handlingUnitContentId: handlingUnitContentId }}
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                setSuccessDeleteResult={setSuccessDeleteResult}
                setData={setCurrentHucfs}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            handlingUnitContentId: string;
                            handlingUnitContent_handlingUnitId: string;
                            handlingUnitContent_handlingUnit_name: string;
                            handlingUnitContent_articleId: string;
                            handlingUnitContent_article_name: string;
                            handlingUnitContent_stockStatus: number;
                            handlingUnitContent_quantity: number;
                            handlingUnitContent_handlingUnit_locationId: string;
                            handlingUnitContent_handlingUnit_location_name: string;
                            handlingUnitContent_stockOwnerId: string;
                            handlingUnitContent_stockOwner_name: string;
                            featureCode_name: string;
                            value: any;
                            extraText2: string;
                        }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParamsFromDictionary(`${rootPath}/[id]`, {
                                            id: record.id,
                                            handlingUnitContentId: record.handlingUnitContentId
                                        })}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable &&
                                handlingUnit_category == parameters.HANDLING_UNIT_CATEGORY_STOCK ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isSoftDeletable &&
                                handlingUnit_category == parameters.HANDLING_UNIT_CATEGORY_STOCK ? (
                                    <Button
                                        icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                        onClick={() =>
                                            confirmAction(
                                                record.id,
                                                setIdToDisable,
                                                'disable',
                                                undefined
                                            )()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable &&
                                handlingUnit_category == parameters.HANDLING_UNIT_CATEGORY_STOCK ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDelete, 'delete', {
                                                articleId: record.handlingUnitContent_articleId,
                                                articleName:
                                                    record.handlingUnitContent_article_name,
                                                stockStatus: record.handlingUnitContent_stockStatus,
                                                quantity: Number(
                                                    record.handlingUnitContent_quantity
                                                ),
                                                locationId:
                                                    record.handlingUnitContent_handlingUnit_locationId,
                                                locationName:
                                                    record.handlingUnitContent_handlingUnit_location_name,
                                                handlingUnitId:
                                                    record.handlingUnitContent_handlingUnitId,
                                                handlingUnitName:
                                                    record.handlingUnitContent_handlingUnit_name,
                                                stockOwnerId:
                                                    record.handlingUnitContent_stockOwnerId,
                                                stockOwnerName:
                                                    record.handlingUnitContent_stockOwner_name,
                                                handlingUnitContentId: record.handlingUnitContentId
                                            })()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={'/handling-unit-contents/feature/:id'}
            />
        </>
    );
};

export { HandlingUnitContentDetailsExtra };
