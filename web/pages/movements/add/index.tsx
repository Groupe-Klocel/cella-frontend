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
import { FC } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { MovementModelV2 } from 'models/MovementModelV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppState } from 'context/AppContext';
import { AddMovement } from 'modules/Movements/PagesContainer/AddMovement';

type PageComponent = FC & { layout: typeof MainLayout };

const AddMovementPage: PageComponent = () => {
    const { t } = useTranslation();
    const { configs } = useAppState();
    const statusToSend = configs.find((config: any) => {
        return (
            config.scope === `${MovementModelV2.tableName.toLowerCase()}_status` &&
            config.value.toLowerCase() === 'to be processed'
        );
    })?.code;

    const router = useRouter();

    //enter between {} the default values for the form (for instance status "In progress"))
    const defaultValues = { status: statusToSend };

    return (
        <>
            <AppHead title={t('actions:add-movement')} />
            <AddMovement />
        </>
    );
};

AddMovementPage.layout = MainLayout;

export default AddMovementPage;
