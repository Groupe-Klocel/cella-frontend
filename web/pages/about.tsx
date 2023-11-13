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
import { Page, Welcome } from '@components';
import MainLayout from 'components/layouts/MainLayout';
import FrPage from 'modules/AboutCella/Translations/Fr';
import EnPage from 'modules/AboutCella/Translations/En';
import { useRouter } from 'next/router';
import { FC } from 'react';
import styled from 'styled-components';

const CenteredWrapper = styled.div`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    align-items: center;
    padding-top: 70px;
`;

type PageComponent = FC & { layout: typeof MainLayout };

const AboutPage: PageComponent = () => {
    const router = useRouter();

    const language = router.locale;

    return (
        <Page>
            <CenteredWrapper>
                {language == 'fr' && <FrPage />}
                {language == 'en-US' && <EnPage />}
            </CenteredWrapper>
        </Page>
    );
};

AboutPage.layout = MainLayout;

export default AboutPage;
