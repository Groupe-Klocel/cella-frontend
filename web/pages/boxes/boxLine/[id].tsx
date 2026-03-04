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
import { META_DEFAULTS, getModesFromPermissions } from '@helpers';
import { HandlingUnitContentOutboundModelV2 as model } from '@helpers';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useMemo, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { boxesRoutes as itemRoutes } from 'modules/Boxes/Static/boxesRoutes';
import { BoxLineDetailsExtra } from 'modules/Boxes/Elements/BoxLineDetailsExtra';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import { useAppState } from 'context/AppContext';
import configs from '../../../../common/configs.json';
import { MissingModal } from 'components/common/smart/Modals/MissingModal';

type PageComponent = FC & { layout: typeof MainLayout };

const BoxLinePage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [showMissingModal, setShowMissingModal] = useState(false);
    const [missingModalAdditionalInfo, setMissingModalAdditionalInfo] = useState<any>();
    const [refetchTrigger, setRefetchTrigger] = useState(false);

    const { permissions, configs } = useAppState();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const missingPermissions = getModesFromPermissions(
        permissions,
        'wm_button_missing-handling'
    ).includes(ModeEnum.Read);

    const configsParamsCodes = useMemo(() => {
        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return items.find((item: any) => item.scope === scope && item.value === value)?.code;
        };

        const HUCOStatusStarted = parseInt(
            findCodeByScopeAndValue(configs, 'handling_unit_content_outbound_status', 'Started') ??
                '0',
            10
        );
        const HUCOStatusInPreparation = parseInt(
            findCodeByScopeAndValue(
                configs,
                'handling_unit_content_outbound_status',
                'In preparation'
            ) ?? '0',
            10
        );

        return { HUCOStatusStarted, HUCOStatusInPreparation };
    }, [configs]);

    // #region to customize information
    const boxDetailBreadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.handlingUnitOutbound_name}`,
            path: '/boxes/' + data?.handlingUnitOutboundId
        }
    ];

    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const breadCrumb = [
        ...boxDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:line')} ${data?.lineNumber}`
        }
    ];

    const pageTitle = `${data?.handlingUnitOutbound_name} - ${t('common:line')} ${
        data?.lineNumber
    }`;
    // #endregions

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

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        actionsComponent: (
            <Space>
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                model.isEditable &&
                data?.status < configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_ESTIMATED ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/boxLine/edit/${id}`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isSoftDeletable &&
                data?.status < configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_ESTIMATED ? (
                    <Button
                        onClick={() => confirmAction(id as string, setIdToDisable)()}
                        type="primary"
                    >
                        {t('actions:disable')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isDeletable &&
                data?.status < configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_ESTIMATED ? (
                    <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
                {missingPermissions &&
                data &&
                (data?.status === configsParamsCodes.HUCOStatusStarted ||
                    data?.status === configsParamsCodes.HUCOStatusInPreparation) &&
                data?.roundLineDetail_processedQuantity !==
                    data?.roundLineDetail_quantityToBeProcessed ? (
                    <Button
                        style={{ backgroundColor: '#d46b08' }}
                        onClick={() => {
                            setMissingModalAdditionalInfo({
                                box: data.handlingUnitOutbound_name,
                                line: data.lineNumber,
                                maxQuantity:
                                    data.roundLineDetail_quantityToBeProcessed -
                                        data.roundLineDetail_processedQuantity <
                                    data.quantityToBePicked -
                                        data.missingQuantity -
                                        data.pickedQuantity
                                        ? data.roundLineDetail_quantityToBeProcessed -
                                          data.roundLineDetail_processedQuantity
                                        : data.quantityToBePicked -
                                          data.missingQuantity -
                                          data.pickedQuantity
                            });
                            setShowMissingModal(true);
                        }}
                    >
                        {t('common:missing-quantity')}
                    </Button>
                ) : (
                    <></>
                )}
            </Space>
        )
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                extraDataComponent={<BoxLineDetailsExtra contentId={data?.handlingUnitContentId} />}
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                refetch={refetchTrigger}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
            />
            <MissingModal
                showModal={{ showMissingModal, setShowMissingModal }}
                inputToValidate={{
                    handlingUnitContentOutboundId: data?.id
                }}
                additionalInfos={missingModalAdditionalInfo}
                setRefetchTrigger={setRefetchTrigger}
            />
        </>
    );
};

BoxLinePage.layout = MainLayout;

export default BoxLinePage;
