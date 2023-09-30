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
// import { AppHead, HeaderContent } from '@components';
// import { useRouter } from 'next/router';
// import { FC, useEffect, useState } from 'react';
// import { EditItemComponent } from 'modules/Crud/EditItemComponent';
// import useTranslation from 'next-translate/useTranslation';
// import { META_DEFAULTS, useEquipment, usePackagings } from '@helpers';
// import { FormDataType, FormOptionType } from 'models/Models';
// import { useListParametersForAScopeQuery } from 'generated/graphql';
// import MainLayout from 'components/layouts/MainLayout';
// import { EquipmentDetailModel } from 'models/EquipmentDetailModel';
// import { equipmentRoutes } from 'modules/Equipment/Static/equipmentRoutes';
// import { useAuth } from 'context/AuthContext';

// type PageComponent = FC & { layout: typeof MainLayout };

// const EditEquipmentDetailPage: PageComponent = () => {
//     const { graphqlRequestClient } = useAuth();
//     const { t } = useTranslation();
//     const errorMessageEmptyInput = t('messages:error-message-empty-input');

//     const [packagingId, setStatusPackaging] = useState<Array<FormOptionType>>();
//     const [equipmentOptions, setStatusEquipment] = useState<Array<FormOptionType>>();
//     const [modePreparation, setModePreparation] = useState<Array<FormOptionType>>();
//     const [stockOwnerOptions, setStockOwnerEquipment] = useState<Array<FormOptionType>>();
//     const packagingData = usePackagings({}, 1, 100, null);
//     const equipmentData = useEquipment({}, 1, 100, null);
//     const stockOwnerData = useEquipment({}, 1, 100, null);

//     const router = useRouter();
//     const { id } = router.query;
//     const [data, setData] = useState<any>();

//     const equipmentDetailBreadCrumb = [
//         ...equipmentRoutes,
//         {
//             breadcrumbName: `${data?.equipment_name}`,
//             path: '/equipment/' + data?.equipmentId
//         }
//     ];
//     const breadsCrumb = [
//         ...equipmentDetailBreadCrumb,
//         {
//             breadcrumbName: `${data?.equipment_name}`
//         }
//     ];

//     const modePreparationList = useListParametersForAScopeQuery(graphqlRequestClient, {
//         scope: 'preparation_mode'
//     });

//     useEffect(() => {
//         if (modePreparationList) {
//             const newModePreparation: Array<FormOptionType> = [];

//             const cData = modePreparationList?.data?.listParametersForAScope;
//             if (cData) {
//                 cData.forEach((item) => {
//                     newModePreparation.push({ key: parseInt(item.code), text: item.text });
//                 });
//                 setModePreparation(newModePreparation);
//             }
//         }
//     }, [modePreparationList.data]);

//     useEffect(() => {
//         if (packagingData.data) {
//             const newIdOpts: Array<FormOptionType> = [];
//             packagingData.data.packagings?.results.forEach(({ id, name }) => {
//                 newIdOpts.push({ text: name!, key: id! });
//             });
//             setStatusPackaging(newIdOpts);
//         }
//     }, [packagingData.data]);

//     useEffect(() => {
//         const newIdOpts: Array<FormOptionType> = [];
//         newIdOpts.push({ text: data?.equipment_name, key: data?.equipmentId });
//         setStatusEquipment(newIdOpts);
//     }, [equipmentData.data]);

//     useEffect(() => {
//         const newIdOpts: Array<FormOptionType> = [];
//         newIdOpts.push({ text: data?.stockOwner_name, key: data?.stockOwnerId });
//         setStockOwnerEquipment(newIdOpts);
//     }, [stockOwnerData.data]);

//     const title = data?.equipment_name + ' / ' + data?.equipment_name;

//     return (
//         <>
//             <AppHead title={META_DEFAULTS.title} />
//             <EditItemComponent
//                 id={id!}
//                 dataModel={EquipmentDetailModel}
//                 setData={setData}
//                 headerComponent={
//                     <HeaderContent
//                         title={`${t('common:edit-detail')} ${title}`}
//                         routes={breadsCrumb}
//                         onBack={() => router.back()}
//                     />
//                 }
//                 editSteps={[
//                     [
//                         {
//                             name: 'equipmentId',
//                             displayName: 'Equipment',
//                             type: FormDataType.Dropdown,
//                             subOptions: equipmentOptions,
//                             disabled: true
//                         },
//                         {
//                             name: 'stockOwnerId',
//                             type: FormDataType.Dropdown,
//                             subOptions: stockOwnerOptions,
//                             disabled: true
//                         },
//                         {
//                             name: 'packagingId',
//                             type: FormDataType.Dropdown,
//                             rules: [{ required: false, message: errorMessageEmptyInput }],
//                             subOptions: packagingId
//                         },
//                         {
//                             name: 'preparationMode',
//                             type: FormDataType.Dropdown,
//                             rules: [{ required: false, message: errorMessageEmptyInput }],
//                             subOptions: modePreparation
//                         }
//                     ]
//                 ]}
//                 routeAfterSuccess={`/equipment/details/:id`}
//             />
//         </>
//     );
// };

// EditEquipmentDetailPage.layout = MainLayout;

// export default EditEquipmentDetailPage;

import { AppHead } from '@components';
import { META_DEFAULTS } from '@helpers';
import MainLayout from 'components/layouts/MainLayout';
import { EditEquipmentDetail } from 'modules/Equipment/PagesContainer/EditEquipmentDetail';
import { useRouter } from 'next/router';
import { FC } from 'react';

type PageComponent = FC & { layout: typeof MainLayout };

const EditEquipmentDetailPage: PageComponent = () => {
    const router = useRouter();
    const { id } = router.query;
    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <EditEquipmentDetail id={id!} />
        </>
    );
};

EditEquipmentDetailPage.layout = MainLayout;

export default EditEquipmentDetailPage;
