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
import { Button, Space } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import moment from 'moment';
import 'moment/min/locales';
import { getModesFromPermissions, showError, showSuccess, useDelete } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import { ModeEnum } from 'generated/graphql';
import { goodsInsRoutes } from '../Static/goodsInsRoutes';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
}

const GoodsInDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const breadsCrumb = [
        ...goodsInsRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    //PRINT
    const printGoodsIns = async (goodsInId: string) => {
        const local = moment();
        local.locale();
        const dateLocal = local.format('l') + ', ' + local.format('LT');

        const res = await fetch(`/api/goods-ins/print`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                goodsInId,
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

    // DELETE
    const {
        isLoading: deleteLoading,
        result: deleteResult,
        mutate: deleteGoodsIn
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
            title={`${t('common:goods-in')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.push('/goods-ins')}
            actionsRight={
                <Space>
                    {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                        <Button type="primary" onClick={() => printGoodsIns(props.id)}>
                            {t('actions:print')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                        <LinkButton
                            title={t('actions:edit')}
                            path={`/goods-ins/edit/${props.id}`}
                            type="primary"
                        />
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 && modes.includes(ModeEnum.Delete) ? (
                        <Button loading={deleteLoading} onClick={() => deleteGoodsIn(props.id)}>
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

export { GoodsInDetailsHeader };
