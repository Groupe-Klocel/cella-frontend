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
import { Space } from 'antd';
import useTranslation from 'next-translate/useTranslation';

import configs from '../../../../common/configs.json';
import { FC } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import { ModeEnum } from 'generated/graphql';
import { boxesRoutes } from '../Static/boxesRoutes';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    status: any;
}

const BoxLineDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const breadsCrumb = [
        ...boxesRoutes,
        {
            breadcrumbName: `${t('common:boxLine')} / ${props.name}`
        }
    ];

    return (
        <HeaderContent
            title={`${t('common:boxLine')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.back()}
            actionsRight={
                modes.length > 0 && modes.includes(ModeEnum.Update) && props.status != configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_CANCELLED ? (
                    <Space>
                        <LinkButton
                            title={t('actions:edit')}
                            path={`/boxes/boxLine/edit/${props.id}`}
                            type="primary"
                        />
                    </Space>
                ) : (
                    <></>
                )
            }
        />
    );
};

export { BoxLineDetailsHeader };
