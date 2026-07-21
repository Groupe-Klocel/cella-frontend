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
import { DeleteOutlined, EditTwoTone, EyeTwoTone } from '@ant-design/icons';
import {
    getModesFromPermissions,
    pathParamsFromDictionary,
    CustomObjectLineModelV2
} from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Divider, Modal, Space } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useState } from 'react';

export interface ICustomObjectDetailsExtraProps {
    customObjectId?: string | any;
    customObjectName?: string | any;
}

const CustomObjectDetailsExtra = ({
    customObjectId,
    customObjectName
}: ICustomObjectDetailsExtraProps) => {
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const [idToDeleteLine, setIdToDeleteLine] = useState<string | undefined>();
    const [idToDisableLine, setIdToDisableLine] = useState<string | undefined>();
    const [, setCustomObjectLineData] = useState<any[]>([]);
    const customObjectLineModes = getModesFromPermissions(permissions, Table.CustomObjectLine);

    const confirmAction = (id: string | undefined, setId: any) => {
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

    const customObjectLineHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:custom-object-lines') }),
        routes: [],
        actionsComponent:
            customObjectLineModes.length > 0 && customObjectLineModes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:custom-object-line') })}
                    path={pathParamsFromDictionary('/custom-objects/line/add', {
                        customObjectId: customObjectId,
                        customObjectName: customObjectName
                    })}
                    type="primary"
                />
            ) : null
    };

    return (
        <>
            {customObjectLineModes.length > 0 && customObjectLineModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ customObjectId: customObjectId }}
                        dataModel={CustomObjectLineModelV2}
                        headerData={customObjectLineHeaderData}
                        triggerDelete={{
                            idToDelete: idToDeleteLine,
                            setIdToDelete: setIdToDeleteLine
                        }}
                        triggerSoftDelete={{
                            idToDisable: idToDisableLine,
                            setIdToDisable: setIdToDisableLine
                        }}
                        routeDetailPage={'/custom-objects/line/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string; lineNumber: number }) => (
                                    <Space>
                                        {customObjectLineModes.length > 0 &&
                                        customObjectLineModes.includes(ModeEnum.Read) ? (
                                            <LinkButton
                                                icon={<EyeTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/custom-objects/line/[id]',
                                                    {
                                                        id: record.id
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {customObjectLineModes.length > 0 &&
                                        customObjectLineModes.includes(ModeEnum.Update) &&
                                        CustomObjectLineModelV2.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/custom-objects/line/edit/[id]',
                                                    {
                                                        id: record.id
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {customObjectLineModes.length > 0 &&
                                        customObjectLineModes.includes(ModeEnum.Delete) &&
                                        CustomObjectLineModelV2.isDeletable ? (
                                            <Button
                                                icon={<DeleteOutlined />}
                                                danger
                                                onClick={() =>
                                                    confirmAction(record.id, setIdToDeleteLine)()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                        setData={setCustomObjectLineData}
                        searchable={false}
                        sortDefault={[{ field: 'lineNumber', ascending: true }]}
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

CustomObjectDetailsExtra.displayName = 'CustomObjectDetailsExtra';

export { CustomObjectDetailsExtra };
