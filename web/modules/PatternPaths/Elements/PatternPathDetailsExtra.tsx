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
import { EyeTwoTone } from '@ant-design/icons';
import { pathParams, getModesFromPermissions } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Divider, Typography } from 'antd';
import { useState } from 'react';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { ListComponent } from 'modules/Crud/ListComponentV2';
import { PatternPathLocationModelV2 } from '@helpers';
import { PatternPathLink_PatternPathModelV2 } from '@helpers';

const { Title } = Typography;

export interface IItemDetailsProps {
    id?: string | any;
}

const PatternPathDetailsExtra = ({ id }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const { permissions } = useAppState();
    const patternsModes = getModesFromPermissions(permissions, Table.Pattern);
    const locationsModes = getModesFromPermissions(permissions, Table.Location);

    return (
        <>
            {patternsModes.length > 0 && patternsModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <Title level={4}>{t('common:associated-patterns')}</Title>
                    <ListComponent
                        searchCriteria={{ patternPathId: id }}
                        dataModel={PatternPathLink_PatternPathModelV2}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { patternId: string }) => (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams('/patterns/[id]', record.patternId)}
                                    />
                                )
                            }
                        ]}
                        searchable={false}
                    />
                </>
            ) : (
                <></>
            )}
            {locationsModes.length > 0 && locationsModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <Title level={4}>{t('common:associated-locations')}</Title>
                    <ListComponent
                        searchCriteria={{ patternPathId: id }}
                        dataModel={PatternPathLocationModelV2}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        sortDefault={[{ ascending: true, field: 'order' }]}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { locationId: string }) => (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams('/locations/[id]', record.locationId)}
                                    />
                                )
                            }
                        ]}
                        searchable={false}
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { PatternPathDetailsExtra };
