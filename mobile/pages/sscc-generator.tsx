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
import { PageContentWrapper, NavButton, WrapperSimple } from '@components';
import MainLayout from 'components/layouts/MainLayout';
import { FC, useState } from 'react';
import { HeaderContent, RadioInfosHeader } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { LsIsSecured, showError } from '@helpers';
import { Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';

type PageComponent = FC & { layout: typeof MainLayout };

const QuantityMvmt: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const [displayed, setDisplayed] = useState<any>({});

    const previousPage = () => {
        router.back();
    };

    // ask about creating a SSCC generator page elsewhere in case client would need it?

    const generateSSCC = async () => {
        const token = Cookies.get('token');

        const requestHeader = {
            authorization: `Bearer ${token}`
        };
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_WMS_URL}/api/handling-units/sscc-generator`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    extensionDigit: 0,
                    requestHeader
                })
            }
        );

        if (!res.ok) {
            showError(t('messages:error-generating-SSCC'));
        }
        const response = await res.json();
        if (response) {
            const object: { [k: string]: any } = {};
            object['SSCC'] = response.response;
            setDisplayed(object);
        }
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('SSCC')}
                actionsRight={
                    <Space>
                        <NavButton icon={<ArrowLeftOutlined />} onClick={previousPage}></NavButton>
                    </Space>
                }
            />
            <WrapperSimple>
                <NavButton onClick={generateSSCC}>{t('menu:generate-sscc')}</NavButton>
                {!displayed ? (
                    <></>
                ) : (
                    <RadioInfosHeader
                        input={{
                            displayed: displayed
                        }}
                    ></RadioInfosHeader>
                )}
            </WrapperSimple>
        </PageContentWrapper>
    );
};

QuantityMvmt.layout = MainLayout;

export default QuantityMvmt;
