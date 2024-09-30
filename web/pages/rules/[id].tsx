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
import { RuleModelV2 as model } from 'models/RuleModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { META_DEFAULTS, getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import useTranslation from 'next-translate/useTranslation';
import { rulesRoutes as itemRoutes } from 'modules/Rules/Static/rulesRoutes';
import { Button, Modal, Space } from 'antd';
import {
    CancelRuleMutation,
    CancelRuleMutationVariables,
    ModeEnum,
    useCancelRuleMutation
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { RuleDetailsExtra } from 'modules/Rules/Elements/RuleDetailsExtra';

type PageComponent = FC & { layout: typeof MainLayout };

const RulePage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const { graphqlRequestClient } = useAuth();
    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:rule')} ${data?.name}`;
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

    // CANCEL RULE
    const { mutate: cancelRuleMutate, isPending: cancelLoading } = useCancelRuleMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CancelRuleMutation,
                _variables: CancelRuleMutationVariables,
                _context: any
            ) => {
                if (!cancelLoading) {
                    if (data.deleteRule) {
                        showSuccess(t('messages:success-canceled'));
                        router.reload();
                    } else {
                        showError(t('messages:error-canceling-data'));
                    }
                }
            },
            onError: (err) => {
                showError(t('messages:error-canceling-data'));
            }
        }
    );

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                    <Space>
                        <LinkButton
                            title={t('actions:edit')}
                            path={`/rules/edit/${data?.id}`}
                            type="primary"
                        />

                        {modes.length > 0 &&
                        modes.includes(ModeEnum.Delete) &&
                        model.isSoftDeletable ? (
                            <Button
                                onClick={() => confirmAction(id as string, setIdToDisable)()}
                                type="primary"
                            >
                                {t('actions:cancel')}
                            </Button>
                        ) : (
                            <></>
                        )}
                        {modes.length > 0 &&
                        modes.includes(ModeEnum.Delete) &&
                        model.isDeletable ? (
                            <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                                {t('actions:delete')}
                            </Button>
                        ) : (
                            <></>
                        )}
                    </Space>
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
                extraDataComponent={<RuleDetailsExtra ruleId={id} ruleName={data?.name} />}
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

RulePage.layout = MainLayout;

export default RulePage;
