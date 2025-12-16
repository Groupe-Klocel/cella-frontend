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
import { ThirdPartyAddressContactModelV2 as model } from '@helpers';
import { getModesFromPermissions, pathParams, pathParamsFromDictionary } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useState } from 'react';
import configs from '../../../../common/configs.json';
import { LinkButton } from '@components';
import {
    DeleteOutlined,
    EditTwoTone,
    EyeTwoTone,
    LockTwoTone,
    UnlockTwoTone
} from '@ant-design/icons';

const { Title } = Typography;

export interface IItemDetailsProps {
    thirdPartyId?: string | any;
    thirdPartyName?: string | any;
    thirdPartyAddressId?: string | any;
    thirdPartyAddressName?: string | any;
    thirdPartyAddressStatus?: string | any;
}

const ThirdPartyAddressDetailsExtra = ({
    thirdPartyId,
    thirdPartyName,
    thirdPartyAddressId,
    thirdPartyAddressName,
    thirdPartyAddressStatus
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [reopenInfo, setReopenInfo] = useState<string | undefined>();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, model.tableName);

    const thirdPartyAddressContactHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:third-party-address-contacts') }),
        routes: [],
        actionsComponent:
            modes.length > 0 &&
            modes.includes(ModeEnum.Create) &&
            thirdPartyAddressStatus != configs.THIRD_PARTY_ADDRESS_STATUS_DISABLED ? (
                <LinkButton
                    title={t('actions:associate', {
                        name: t('common:third-party-address-contact')
                    })}
                    path={pathParamsFromDictionary('/third-parties/address/contact/add', {
                        thirdPartyId: thirdPartyId,
                        thirdPartyName: thirdPartyName,
                        thirdPartyAddressId: thirdPartyAddressId,
                        thirdPartyAddressName: thirdPartyAddressName
                    })}
                    type="primary"
                />
            ) : null
    };

    const confirmAction = (
        info: any | undefined,
        setInfo: any,
        action: 'delete' | 'disable' | 'enable'
    ) => {
        return () => {
            const titre =
                action == 'enable'
                    ? 'messages:enable-confirm'
                    : action == 'delete'
                      ? 'messages:delete-confirm'
                      : 'messages:disable-confirm';
            Modal.confirm({
                title: t(titre),
                onOk: () => {
                    setInfo(info);
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
                        searchCriteria={{ thirdPartyAddressId: thirdPartyAddressId }}
                        dataModel={model}
                        headerData={thirdPartyAddressContactHeaderData}
                        routeDetailPage={'/third-parties/address/contact/:id'}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        triggerReopen={{ reopenInfo, setReopenInfo }}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string; name: string; status: number }) => (
                                    <Space>
                                        {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                            <LinkButton
                                                icon={<EyeTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/third-parties/address/contact/[id]',
                                                    { id: record.id, thirdPartyId, thirdPartyName }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Update) &&
                                        model.isEditable &&
                                        record.status !=
                                            configs.THIRD_PARTY_ADDRESS_CONTACT_STATUS_DISABLED ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/third-parties/address/contact/edit/[id]',
                                                    {
                                                        id: record.id,
                                                        thirdPartyId,
                                                        thirdPartyName
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Delete) &&
                                        model.isSoftDeletable &&
                                        record.status !=
                                            configs.THIRD_PARTY_ADDRESS_CONTACT_STATUS_DISABLED ? (
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
                                        model.isDeletable &&
                                        record.status !=
                                            configs.THIRD_PARTY_ADDRESS_CONTACT_STATUS_DISABLED ? (
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
                                        {record.status ==
                                        configs.THIRD_PARTY_ADDRESS_CONTACT_STATUS_DISABLED ? (
                                            <Button
                                                icon={<UnlockTwoTone twoToneColor="#b3cad6" />}
                                                onClick={() =>
                                                    confirmAction(
                                                        {
                                                            id: record.id,
                                                            status: configs.THIRD_PARTY_ADDRESS_CONTACT_STATUS_ENABLED
                                                        },
                                                        setReopenInfo,
                                                        'enable'
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

export { ThirdPartyAddressDetailsExtra };
