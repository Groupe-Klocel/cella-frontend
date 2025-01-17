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
import { loadsRoutes } from 'modules/Loads/Static/LoadsRoutes';
import { ModeEnum } from 'generated/graphql';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import moment from 'moment';
import 'moment/min/locales';
import { FC } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import configs from '../../../../common/configs.json';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    status: any;
    stockOwnerId: string;
}

const LoadDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const breadsCrumb = [
        ...loadsRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    // PRINT
    const printLoad = async (loadId: string) => {
        const local = moment();
        local.locale();
        const dateLocal = local.format('l') + ', ' + local.format('LT');

        const res = await fetch(`/api/loads/print`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                loadId,
                dateLocal
            })
        });
        if (!res.ok) {
            showError(t('messages:error-print-data'));
        }
        const response = await res.json();
        if (response.url) {
            window.open(response.url, '_blank');
        } else {
            showError(t('messages:error-print-data'));
        }
    };

    //PRINT LABEL
    const printLoadsLabel = async (loadId: string) => {
        const res = await fetch(`/api/loads/print/label`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                loadId
            })
        });

        const response = await res.json();
        if (response.url) {
            window.open(response.url, '_blank');
        } else {
            showError(t('messages:error-print-data'));
        }
    };

    return (
        <HeaderContent
            title={`${t('common:load')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.push('/loads')}
            actionsRight={
                <Space>
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    props.status == configs.LOAD_STATUS_CREATED ? (
                        <LinkButton
                            title={t('actions:edit')}
                            path={`/loads/edit/${props.id}`}
                            type="primary"
                        />
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                        <>
                            <Button type="primary" onClick={() => printLoad(props.id)}>
                                {t('actions:print')}
                            </Button>
                            <Button type="primary" onClick={() => printLoadsLabel(props.id)}>
                                {t('actions:load-label')}
                            </Button>
                        </>
                    ) : (
                        <></>
                    )}
                </Space>
            }
        />
    );
};

export { LoadDetailsHeader };
