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
import { Space, Button, Modal } from 'antd';
import { featureCodesRoutes } from 'modules/FeatureCodes/Static/featureCodesRoutes';
import { useTranslationWithFallback as useTranslation } from '@helpers';

import { FC, useEffect } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, showSuccess, useDelete } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import { ModeEnum } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    status: any;
}

const FeatureCodeDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const breadsCrumb = [
        ...featureCodesRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    const {
        isLoading: deleteLoading,
        result: deleteResult,
        mutate: DeleteFeatureCode
    } = useDelete(props.dataModel.endpoints.delete);

    useEffect(() => {
        if (!(deleteResult && deleteResult.data)) return;

        if (deleteResult.success) {
            showSuccess(t('messages:success-deleted'));
            router.back();
        } else {
            showError(t('messages:error-deleting-data'));
        }
    }, [deleteResult]);

    return (
        <HeaderContent
            title={`${t('common:feature-codes')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.push('/feature-codes')}
            actionsRight={
                <Space>
                    {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                        <LinkButton
                            title={t('actions:edit')}
                            path={`/feature-codes/edit/${props.id}`}
                            type="primary"
                        />
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 && modes.includes(ModeEnum.Delete) ? (
                        <Button loading={deleteLoading} onClick={() => DeleteFeatureCode(props.id)}>
                            {t('actions:delete')}
                        </Button>
                    ) : (
                        <></>
                    )}
                </Space>
            }
        />
    );
};

export { FeatureCodeDetailsHeader };
