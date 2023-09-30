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
import { FC, useEffect, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { LoadModelV2 } from 'models/LoadModelV2';
import useTranslation from 'next-translate/useTranslation';
import { META_DEFAULTS, showError } from '@helpers';
import configs from '../../../../common/configs.json';
import { addLoadRoutes } from 'modules/Loads/Static/LoadsRoutes';
import 'moment/min/locales';
import moment from 'moment';
import { AddLoadComponent } from 'modules/Loads/PageContainer/AddLoadComponent';

type PageComponent = FC & { layout: typeof MainLayout };

const AddLoadPage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const defaultValues = { status: configs.LOAD_STATUS_CREATED };
    const [print, setPrint] = useState<any>();
    const [loadPrint, setLoadPrint] = useState<string>('');

    const printLoad = async (loadId: string) => {
        const res = await fetch(`/api/loads/print/label`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                loadId
            })
        });

        if (!res.ok) {
            showError(t('messages:error-print-data'));
            router.push(`/loads/${print?.id}`);
        }
        const response = await res.json();
        if (response.url) {
            window.open(response.url, '_blank');
            router.push(`/loads/${print?.id}`);
        } else {
            showError(t('messages:error-print-data'));
            router.push(`/loads/${print?.id}`);
        }
    };

    useEffect(() => {
        if (print) {
            setLoadPrint(print);
            printLoad(print?.id);
        }
    }, [print]);

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <AddLoadComponent
                dataModel={LoadModelV2}
                headerComponent={
                    <HeaderContent
                        title={t('actions:add2', { name: t('common:load') })}
                        routes={addLoadRoutes}
                        onBack={() => router.push(`/loads`)}
                    />
                }
                routeOnCancel={`/loads`}
                setPrint={setPrint}
                print={loadPrint}
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
            />
        </>
    );
};

AddLoadPage.layout = MainLayout;

export default AddLoadPage;
