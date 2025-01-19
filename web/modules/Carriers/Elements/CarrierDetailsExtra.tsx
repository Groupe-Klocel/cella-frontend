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
import { Button, Divider, Modal, Space, Typography } from 'antd';
import { ModeEnum } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { CarrierShippingModeModelV2 as model } from 'models/CarrierShippingModeModelV2';
import { getModesFromPermissions, pathParams, pathParamsFromDictionary } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useState } from 'react';
import configs from '../../../../common/configs.json';
import { LinkButton } from '@components';
import { DeleteOutlined, EditTwoTone, EyeTwoTone, LockTwoTone } from '@ant-design/icons';

const { Title } = Typography;

export interface IItemDetailsProps {
    carrierId?: string | any;
    carrierName?: string | any;
    carrierStatus?: string | any;
}

const CarrierDetailsExtra = ({ carrierId, carrierName, carrierStatus }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, model.tableName);

    const carrierShippingModeHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:shipping-modes') }),
        routes: [],
        actionsComponent:
            modes.length > 0 &&
            modes.includes(ModeEnum.Create) &&
            carrierStatus != configs.CARRIER_STATUS_CLOSED ? (
                <LinkButton
                    title={t('actions:associate', { name: t('common:shipping-mode') })}
                    path={pathParamsFromDictionary('/carriers/shipping-mode/add', {
                        carrierId: carrierId,
                        carrierName: carrierName
                    })}
                    type="primary"
                />
            ) : null
    };

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:delete-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    return (
        <>
            {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ carrierId: carrierId }}
                        dataModel={model}
                        headerData={carrierShippingModeHeaderData}
                        routeDetailPage={'/carriers/shipping-mode/:id'}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: {
                                    id: string;
                                    articleId: string;
                                    article_name: string;
                                    barcodeId: string;
                                    barcode_name: string;
                                    name: string;
                                }) => (
                                    <Space>
                                        {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                            <LinkButton
                                                icon={<EyeTwoTone />}
                                                path={pathParams(
                                                    '/carriers/shipping-mode/[id]',
                                                    record.id
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Update) &&
                                        model.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/carriers/shipping-mode/edit/[id]',
                                                    {
                                                        id: record.id,
                                                        articleId: record?.articleId,
                                                        articleName: record?.article_name,
                                                        name: record?.name
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Delete) &&
                                        model.isSoftDeletable ? (
                                            <Button
                                                icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDisable,
                                                        'disable'
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
                                                        'delete'
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
                        searchable={false}
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { CarrierDetailsExtra };
