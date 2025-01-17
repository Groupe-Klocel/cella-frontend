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
import { Space, Button, Modal } from 'antd';
import { roundsRoutes } from 'modules/Rounds/Static/roundsRoutes';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import configs from '../../../../common/configs.json';

import { FC, useState } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import { ModeEnum } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    status: number | any;
}

const RoundDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const breadsCrumb = [
        ...roundsRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    // const startRound = ({ roundId }: CancelRoundMutationVariables) => {
    //     Modal.confirm({
    //         title: t('messages:cubing-confirm'),
    //         onOk: () => {
    //             // TODO:  CALL MUTATE HERE
    //         },
    //         okText: t('messages:confirm'),
    //         cancelText: t('messages:cancel')
    //     });
    // };

    // const printRound = ({ id }: DeletePurchaseOrderMutationVariables) => {
    //     console.log('print purchase order');
    // };

    return (
        <HeaderContent
            title={`${t('common:round')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.push('/rounds')}
            actionsRight={
                modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                    <Space>
                        {
                            // CUBING button
                            props.status <= configs.ROUND_STATUS_ESTIMATED ? (
                                <Button
                                //loading={startRoundLoading}
                                //onClick={() => startRound({ roundId: props.id })}
                                >
                                    {t('actions:cubing')}
                                </Button>
                            ) : (
                                <></>
                            )
                        }
                        {
                            // RECUBING button
                            props.status == configs.ROUND_STATUS_STARTED ||
                            props.status == configs.ROUND_STATUS_IN_PREPARATION ? (
                                <Button
                                //loading={cancelLoading}
                                //onClick={() => printRound({ id: props.id })}
                                >
                                    {t('actions:recubing')}
                                </Button>
                            ) : (
                                <></>
                            )
                        }
                    </Space>
                ) : (
                    <></>
                )
            }
        />
    );
};

export { RoundDetailsHeader };
