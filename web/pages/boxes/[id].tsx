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
import { AppHead } from '@components';
import { META_DEFAULTS } from '@helpers';
import { BoxModel } from 'models/BoxModel';
import { ItemDetailComponent } from 'modules/Crud/ItemDetailComponent';
import { BoxDetailsHeader } from 'modules/Boxes/Elements/BoxDetailsHeader';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { BoxDetailsExtra } from 'modules/Boxes/Elements/BoxDetailsExtra';

type PageComponent = FC & { layout: typeof MainLayout };

const BoxPage: PageComponent = () => {
    const router = useRouter();
    const { id } = router.query;

    const [data, setData] = useState<any>();
    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                extraDataComponent={<BoxDetailsExtra boxId={id!} huId={data?.handlingUnitId} />}
                headerComponent={
                    <BoxDetailsHeader
                        name={data?.name}
                        id={id!}
                        dataModel={BoxModel}
                        status={data?.status}
                    />
                }
                id={id!}
                dataModel={BoxModel}
                setData={setData}
            />
        </>
    );
};

BoxPage.layout = MainLayout;

export default BoxPage;
