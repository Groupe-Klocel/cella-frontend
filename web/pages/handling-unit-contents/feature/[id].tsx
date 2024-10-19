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
import { HandlingUnitContentFeatureModelV2 as model } from 'models/HandlingUnitContentFeatureModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import {
    META_DEFAULTS,
    getModesFromPermissions,
    showError,
    setUTCDateTime,
    formatUTCLocaleDateTime,
    isStringDateTime,
    setUTCDate,
    isStringDate,
    formatUTCLocaleDate
} from '@helpers';
import { useAppState } from 'context/AppContext';
import useTranslation from 'next-translate/useTranslation';
import { handlingUnitContentsSubRoutes as itemRoutes } from 'modules/HandlingUnits/Static/handlingUnitContentsRoutes';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import { isString } from 'lodash';

type PageComponent = FC & { layout: typeof MainLayout };

const HandlingUnitContentPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    let displayedValue;
    if (isString(data?.value) && isStringDateTime(data?.value) && data?.featureCode_dateType) {
        displayedValue = formatUTCLocaleDateTime(data?.value, router.locale);
    } else if (isString(data?.value) && isStringDate(data?.value) && data?.featureCode_dateType) {
        displayedValue = formatUTCLocaleDate(data?.value, router.locale);
    } else {
        displayedValue = data?.value;
    }

    // #region to customize information
    const hucDetailBreadcrumb = [
        ...itemRoutes,
        {
            path: `/handling-unit-contents/${data?.handlingUnitContentId}`,
            breadcrumbName: `${data?.handlingUnitContent_handlingUnit_name} - ${data?.handlingUnitContent_article_name} x ${data?.handlingUnitContent_quantity}`
        }
    ];
    const breadCrumb = [
        ...hucDetailBreadcrumb,
        {
            breadcrumbName: `${data?.featureCode_name} - ${displayedValue}`
        }
    ];
    const pageTitle = `${t('common:content-feature')} ${
        data?.featureCode_name
    } - ${displayedValue}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const confirmAction = (id: string | undefined, setId: any) => {
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
                                originData: {
                                    articleId: data.handlingUnitContent_articleId,
                                    articleName: data.handlingUnitContent_article_name,
                                    stockStatus: data.handlingUnitContent_stockStatus,
                                    quantity: 1,
                                    locationId: data.handlingUnitContent_handlingUnit_locationId,
                                    locationName:
                                        data.handlingUnitContent_handlingUnit_location_name,
                                    handlingUnitId: data.handlingUnitContent_handlingUnitId,
                                    handlingUnitName: data.handlingUnitContent_handlingUnit_name,
                                    stockOwnerId: data.handlingUnitContent_stockOwnerId,
                                    stockOwnerName: data.handlingUnitContent_stockOwner_name,
                                    handlingUnitContentId: data.handlingUnitContentId,
                                    feature: {
                                        code: data.featureCode_name,
                                        value: data.value
                                    }
                                },
                                destinationData: {
                                    articleId: data.handlingUnitContent_articleId,
                                    articleName: data.handlingUnitContent_article_name,
                                    stockStatus: data.handlingUnitContent_stockStatus,
                                    quantity: Number(data.handlingUnitContent_quantity) - 1,
                                    locationId: data.handlingUnitContent_handlingUnit_locationId,
                                    locationName:
                                        data.handlingUnitContent_handlingUnit_location_name,
                                    handlingUnitId: data.handlingUnitContent_handlingUnitId,
                                    handlingUnitName: data.handlingUnitContent_handlingUnit_name,
                                    stockOwnerId: data.handlingUnitContent_stockOwnerId,
                                    stockOwnerName: data.handlingUnitContent_stockOwner_name,
                                    handlingUnitContentId: data.handlingUnitContentId
                                }
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

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: `/handling-unit-contents/${data?.handlingUnitContentId}`,
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/feature/edit/${id}`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isSoftDeletable ? (
                    <Button
                        onClick={() => confirmAction(id as string, setIdToDisable)()}
                        type="primary"
                    >
                        {t('actions:disable')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isDeletable ? (
                    <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
            </Space>
        )
    };
    // #endregion

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
            />
        </>
    );
};

HandlingUnitContentPage.layout = MainLayout;

export default HandlingUnitContentPage;
