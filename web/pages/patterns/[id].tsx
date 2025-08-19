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
import { META_DEFAULTS, getModesFromPermissions, showError, showInfo, showSuccess } from '@helpers';
import { PatternModelV2 as model } from 'models/PatternModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { PatternDetailsExtra } from 'modules/Patterns/Elements/PatternDetailsExtras';
import { patternsRoutes as itemRoutes } from 'modules/Patterns/Static/patternsRoutes';
import { useRouter } from 'next/router';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import configs from '../../../common/configs.json';
type PageComponent = FC & { layout: typeof MainLayout };

const PatternPage: PageComponent = () => {
    const router = useRouter();
    const { id } = router.query;
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [reopenInfo, setReopenInfo] = useState<any | undefined>();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:pattern')} ${data?.name}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = itemRoutes[itemRoutes.length - 1].path;

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

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                model.isEditable &&
                data?.status !== configs.PATTERN_STATUS_CLOSED ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/edit/${id}`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isSoftDeletable &&
                !data?.patternPaths_id &&
                data?.status !== configs.PATTERN_STATUS_CLOSED ? (
                    <Button
                        onClick={() => confirmAction(id as string, setIdToDisable, 'disable')()}
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
                !data?.patternPaths_id ? (
                    <Button onClick={() => confirmAction(id as string, setIdToDelete, 'delete')()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
                {data?.status == configs.PATTERN_STATUS_CLOSED ? (
                    <Button
                        onClick={() =>
                            confirmAction(
                                { id, status: configs.PATTERN_STATUS_IN_PROGRESS },
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
            </Space>
        )
    };
    // #endregion

    return (
        <>
            <>
                <AppHead title={headerData.title} />
                <ItemDetailComponent
                    extraDataComponent={<PatternDetailsExtra id={id!} name={data?.name} />}
                    headerData={headerData}
                    id={id!}
                    dataModel={model}
                    setData={setData}
                    triggerDelete={{ idToDelete, setIdToDelete }}
                    triggerSoftDelete={{ idToDisable, setIdToDisable }}
                    triggerReopen={{ reopenInfo, setReopenInfo }}
                />
            </>
        </>
    );
};

PatternPage.layout = MainLayout;

export default PatternPage;
