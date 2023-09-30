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
import { AppHead, LinkButton } from '@components';
import { getModesFromPermissions, META_DEFAULTS } from '@helpers';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { ModeEnum, useListConfigsForAScopeQuery } from 'generated/graphql';
import { FormDataType, FormOptionType } from 'models/Models';
import { PatternPathModelV2 } from 'models/PatternPathModelV2';
import { HeaderData } from 'modules/Crud/ListComponent';
import { PatternPathListComponent } from 'modules/PatternPaths/Elements/PatternPathListComponent';
import { patternPathsRoutes } from 'modules/PatternPaths/Static/patternPathRoutes';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';

type PageComponent = FC & { layout: typeof MainLayout };

const PatternPathsPage: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, PatternPathModelV2.tableName);
    const [statusTexts, setStatusTexts] = useState<Array<FormOptionType>>();
    const headerData: HeaderData = {
        title: t('common:pattern-paths'),
        routes: patternPathsRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:pattern-path') })}
                    path="/pattern-paths/add"
                    type="primary"
                />
            ) : null
    };

    const { graphqlRequestClient } = useAuth();

    const [refresh, doRefresh] = useState(0);

    const statusPatternPathTextList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'pattern_path_status'
    });
    useEffect(() => {
        if (statusPatternPathTextList) {
            const newStatusTexts: Array<FormOptionType> = [];

            const cData = statusPatternPathTextList?.data?.listConfigsForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newStatusTexts.push({ key: parseInt(item.code), text: item.text });
                });
                setStatusTexts(newStatusTexts);
            }
        }
    }, [statusPatternPathTextList.data]);

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <PatternPathListComponent
                refresh={refresh}
                headerData={headerData}
                dataModel={PatternPathModelV2}
                filterFields={[
                    {
                        name: 'name',
                        type: FormDataType.String
                    },
                    {
                        name: 'status',
                        type: FormDataType.Dropdown,
                        subOptions: statusTexts
                    }
                ]}
                routeDetailPage={'/pattern-paths/:id'}
            />
        </>
    );
};

PatternPathsPage.layout = MainLayout;

export default PatternPathsPage;
