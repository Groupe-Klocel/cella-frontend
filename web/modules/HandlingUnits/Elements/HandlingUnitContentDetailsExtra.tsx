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
import { DeleteOutlined, EditTwoTone, EyeTwoTone, StopOutlined } from '@ant-design/icons';
import {
    pathParams,
    META_DEFAULTS,
    getModesFromPermissions,
    pathParamsFromDictionary,
    showError
} from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Button, Divider, Modal, Space } from 'antd';
import { useState } from 'react';
import { ModeEnum } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { handlingUnitContentsSubRoutes as itemRoutes } from 'modules/HandlingUnits/Static/handlingUnitContentsRoutes';
import { useAppState } from 'context/AppContext';
import { HandlingUnitContentFeatureModelV2 as model } from 'models/HandlingUnitContentFeatureModelV2';

export interface IItemDetailsProps {
    handlingUnitContentId?: string | any;
    handlingUnitName?: string | any;
    articleName?: string | any;
    quantity?: Number | any;
}

const HandlingUnitContentDetailsExtra = ({
    handlingUnitContentId,
    handlingUnitName,
    articleName,
    quantity
}: IItemDetailsProps) => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    let rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    rootPath += '/feature';
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const modes = getModesFromPermissions(permissions, model.tableName);

    const headerData: HeaderData = {
        title: t('common:content-features'),
        routes: [],
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', {
                        name: t('common:content-feature')
                    })}
                    path={pathParamsFromDictionary('/handling-unit-contents/feature/add', {
                        handlingUnitContentId: handlingUnitContentId,
                        handlingUnitName: handlingUnitName,
                        articleName: articleName,
                        quantity: quantity
                    })}
                    type="primary"
                />
            ) : null
    };

    const confirmAction = (
        id: string | undefined,
        setId: any,
        action: 'delete' | 'disable',
        originData: any,
        destinationData: any
    ) => {
        return () => {
            Modal.confirm({
                title: t('messages:delete-confirm'),
                onOk: () => {
                    const fetchData = async () => {
                        const res = await fetch(`/api/create-movement/`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                trigger: 'deleteContentFeature',
                                originData,
                                destinationData
                            })
                        });
                        if (res.ok) {
                            setId(id);
                        }
                        if (!res.ok) {
                            const errorResponse = await res.json();
                            if (errorResponse.error.response.errors[0].extensions) {
                                showError(
                                    t(
                                        `errors:${errorResponse.error.response.errors[0].extensions.code}`
                                    )
                                );
                            } else {
                                showError(t('messages:error-update-data'));
                            }
                        }
                    };
                    fetchData();
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

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
                        }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${rootPath}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isSoftDeletable ? (
                                    <Button
                                        icon={<StopOutlined />}
                                        onClick={() =>
                                            confirmAction(
                                                record.id,
                                                setIdToDisable,
                                                'disable',
                                                undefined,
                                                undefined
                                            )()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() =>
                                            confirmAction(
                                                record.id,
                                                setIdToDelete,
                                                'delete',
                                                {
                                                    articleId: record.handlingUnitContent_articleId,
                                                    articleName:
                                                        record.handlingUnitContent_article_name,
                                                    stockStatus:
                                                        record.handlingUnitContent_stockStatus,
                                                    quantity: 1,
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
                                                    handlingUnitContentId:
                                                        record.handlingUnitContentId,
                                                    feature: {
                                                        code: record.featureCode_name,
                                                        value: record.value
                                                    }
                                                },
                                                {
                                                    articleId: record.handlingUnitContent_articleId,
                                                    articleName:
                                                        record.handlingUnitContent_article_name,
                                                    stockStatus:
                                                        record.handlingUnitContent_stockStatus,
                                                    quantity:
                                                        Number(
                                                            record.handlingUnitContent_quantity
                                                        ) - 1,
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
                                                    handlingUnitContentId:
                                                        record.handlingUnitContentId
                                                }
                                            )()
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
