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
import { ParameterModelV2 as model } from 'models/ParameterModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { META_DEFAULTS, getModesFromPermissions } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { featureTypesRoutes as itemRoutes } from 'modules/FeatureTypes/Static/featureTypesRoutes';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import { FeatureTypeDetailsExtra } from 'modules/FeatureTypes/Elements/FeatureTypeDetailsExtra';
import { ParameterDetailsExtra } from 'modules/Parameters/Elements/ParameterDetailsExtra';

type PageComponent = FC & { layout: typeof MainLayout };

const FeatureTypePage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.value}`
        }
    ];

    const pageTitle = `${t('common:feature-type')} ${data?.value}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

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
        actionsComponent: !data?.system ? (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/edit/${id}`}
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
        ) : (
            <></>
        )
    };
    // #endregion

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                extraDataComponent={
                    <>
                        <FeatureTypeDetailsExtra
                            parameterId={id!}
                            featureType={Number(data?.code)}
                        />
                        <ParameterDetailsExtra Id={id} details={data} url={'feature-types'} />
                    </>
                }
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

FeatureTypePage.layout = MainLayout;

export default FeatureTypePage;
