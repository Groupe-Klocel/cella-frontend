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
import { ThirdPartyDocumentModelV2 as model } from 'models/ThirdPartyDocumentModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { META_DEFAULTS, getModesFromPermissions } from '@helpers';
import { thirdPartiesRoutes as itemRoutes } from 'modules/ThirdParties/Static/thirdPartiesRoutes';
import { Button, Modal, Space } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { ThirdPartyAddressDetailsExtra } from 'modules/ThirdParties/Elements/ThirdPartyAddressDetailsExtra';
import configs from '../../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const ThirdPartyDocumentPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const [data, setData] = useState<any>();
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [reopenInfo, setReopenInfo] = useState<any | undefined>();

    const modes = getModesFromPermissions(permissions, model.tableName);

    const parentBreadcrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.thirdParty_name}`,
            path: '/third-parties/' + data?.thirdPartyId
        }
    ];
    const breadcrumb = [
        ...parentBreadcrumb,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const title = `${data?.thirdParty_name} / ${data?.name}`;

    const pageTitle = `${t('common:third-party-address')} ${title}`;

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

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

    function downloadDocument(base64Data: string, fileName: string) {
        const [header, actualBase64] = base64Data.split(',');
        const fileType = header.split(':')[1].split(';')[0];

        const byteCharacters = window.atob(actualBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: fileType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadcrumb,
        onBackRoute: `/third-parties/${data?.thirdPartyId}`,
        actionsComponent:
            data?.status !== configs.THIRD_PARTY_ADDRESS_STATUS_DISABLED ? (
                <Space>
                    {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                        <>
                            <Button
                                type="primary"
                                onClick={() => downloadDocument(data.documentAttached, data.name)}
                            >
                                {t('actions:print')}
                            </Button>
                        </>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
                        <LinkButton
                            title={t('actions:edit')}
                            path={`${rootPath}/address/edit/${id}`}
                            type="primary"
                        />
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Delete) &&
                    model.isSoftDeletable ? (
                        <Button
                            onClick={() => confirmAction(id as string, setIdToDisable, 'disable')()}
                            type="primary"
                        >
                            {t('actions:disable')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isDeletable ? (
                        <Button
                            onClick={() => confirmAction(id as string, setIdToDelete, 'delete')()}
                        >
                            {t('actions:delete')}
                        </Button>
                    ) : (
                        <></>
                    )}
                </Space>
            ) : (
                <>
                    {data?.status == configs.THIRD_PARTY_STATUS_DISABLED ? (
                        <Button
                            onClick={() =>
                                confirmAction(
                                    { id, status: configs.THIRD_PARTY_STATUS_ENABLED },
                                    setReopenInfo,
                                    'enable'
                                )()
                            }
                            type="primary"
                        >
                            {t('actions:enable')}
                        </Button>
                    ) : (
                        <></>
                    )}
                </>
            )
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                triggerReopen={{ reopenInfo, setReopenInfo }}
            />
        </>
    );
};

ThirdPartyDocumentPage.layout = MainLayout;

export default ThirdPartyDocumentPage;
