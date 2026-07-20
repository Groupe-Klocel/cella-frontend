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

// Shows the appointments an entity (delivery / order / purchaseOrder / load) is linked to,
// via its appointment lines, and lets the user de-assign one (soft-delete the line). Rendered
// on the entity detail page; gate its inclusion by the matching appointment_with_* config.

import { LinkButton } from '@components';
import { EyeTwoTone, LockTwoTone } from '@ant-design/icons';
import {
    pathParams,
    useTranslationWithFallback as useTranslation,
    AppointmentLineModelV2
} from '@helpers';
import { Button, Modal, Space } from 'antd';
import { ListComponent } from 'modules/Crud/ListComponentV2';
import { FC, useState } from 'react';

export interface IAppointmentLinesSectionProps {
    fkField: 'deliveryId' | 'orderId' | 'purchaseOrderId' | 'loadId';
    entityId: string;
    canModify: boolean;
}

const AppointmentLinesSection: FC<IAppointmentLinesSectionProps> = ({
    fkField,
    entityId,
    canModify
}) => {
    const { t } = useTranslation();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const confirmDisable = (id: string) => () => {
        Modal.confirm({
            title: t('messages:remove-assignment-confirm'),
            onOk: () => setIdToDisable(id),
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <ListComponent
            searchCriteria={{ [fkField]: entityId }}
            dataModel={AppointmentLineModelV2}
            headerData={{
                title: `${t('common:appointments')}`,
                routes: [],
                actionsComponent: null
            }}
            triggerDelete={undefined}
            triggerSoftDelete={{ idToDisable, setIdToDisable }}
            actionColumns={[
                {
                    title: 'actions:actions',
                    key: 'actions',
                    render: (record: { id: string; appointmentId: string }) => (
                        <Space>
                            <LinkButton
                                icon={<EyeTwoTone />}
                                path={pathParams('/appointments/[id]', record.appointmentId)}
                            />
                            {canModify && (
                                <Button
                                    icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                    onClick={confirmDisable(record.id)}
                                    title={t('actions:remove-from-appointment')}
                                />
                            )}
                        </Space>
                    )
                }
            ]}
            searchable={false}
        />
    );
};

AppointmentLinesSection.displayName = 'AppointmentLinesSection';

export { AppointmentLinesSection };
