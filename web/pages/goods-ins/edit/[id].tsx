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
import { AppHead, HeaderContent } from '@components';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { EditItemComponent } from 'modules/Crud/EditItemComponent';
import useTranslation from 'next-translate/useTranslation';
import { META_DEFAULTS } from '@helpers';
import { FormDataType } from 'models/Models';
import { GoodsInModel } from 'models/GoodsInModel';
import { goodsInsRoutes } from 'modules/GoodsIns/Static/goodsInsRoutes';

type PageComponent = FC & { layout: typeof MainLayout };

const EditGoodsInPage: PageComponent = () => {
    const { t } = useTranslation();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');

    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    const breadsCrumb = [
        ...goodsInsRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <EditItemComponent
                id={id!}
                dataModel={GoodsInModel}
                setData={setData}
                headerComponent={
                    <HeaderContent
                        title={`${t('common:goods-in')} ${data?.name}`}
                        routes={breadsCrumb}
                        onBack={() => router.push(`/goods-ins/${id}`)}
                    />
                }
                editSteps={[
                    [
                        {
                            name: 'name',
                            type: FormDataType.String,
                            disabled: true
                        },
                        {
                            name: 'comment',
                            type: FormDataType.String
                        }
                    ]
                ]}
                routeAfterSuccess={`/goods-ins/:id`}
            />
        </>
    );
};

EditGoodsInPage.layout = MainLayout;

export default EditGoodsInPage;
