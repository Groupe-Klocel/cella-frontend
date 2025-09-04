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
import { Progress } from 'antd';
import configs from '../../../../common/configs.json';
import { useEffect, useState } from 'react';

interface IDeliveryProgressBarProps {
    id: string;
    status: number;
}

const DeliveryProgressBar = ({ id, status }: IDeliveryProgressBarProps) => {
    const [value, setValue] = useState(status == configs.PURCHASE_ORDER_STATUS_CLOSED ? 100 : 0);

    useEffect(() => {
        if (status == configs.DELIVERY_STATUS_CANCELED) {
            setValue(100);
        }
        if (status == configs.DELIVERY_STATUS_DISPATCHED) {
            setValue(100);
        }
        if (status <= configs.DELIVERY_STATUS_LOAD_CANCELLED) {
            setValue(90);
        }
        if (status <= configs.DELIVERY_STATUS_LOAD_IN_PROGRESS) {
            setValue(80);
        }
        if (status <= configs.DELIVERY_STATUS_TO_BE_LOADED) {
            setValue(75);
        }
        if (status <= configs.DELIVERY_STATUS_TO_BE_PALLETIZED) {
            setValue(70);
        }
        if (status <= configs.DELIVERY_STATUS_CHECKED) {
            setValue(65);
        }
        if (status <= configs.DELIVERY_STATUS_TO_BE_CHECKED) {
            setValue(60);
        }
        if (status <= configs.DELIVERY_STATUS_PREPARED) {
            setValue(50);
        }
        if (status <= configs.DELIVERY_STATUS_PACKING_IN_PROGRESS) {
            setValue(40);
        }
        if (status <= configs.DELIVERY_STATUS_TO_BE_REPACKED) {
            setValue(35);
        }
        if (status <= configs.DELIVERY_STATUS_IN_PREPARATION) {
            setValue(30);
        }
        if (status <= configs.DELIVERY_STATUS_STARTED) {
            setValue(20);
        }
        if (status <= configs.DELIVERY_STATUS_ESTIMATED) {
            setValue(15);
        }
        if (status <= configs.DELIVERY_STATUS_TO_BE_ESTIMATED) {
            setValue(10);
        }
        if (status <= configs.DELIVERY_STATUS_CREATED) {
            setValue(5);
        }
        if (status <= configs.DELIVERY_STATUS_CREATION_IN_PROGRESS) {
            setValue(0);
        }
    });
    return (
        <Progress
            type="dashboard"
            percent={value}
            width={80}
            status={
                status == configs.DELIVERY_STATUS_CANCELED
                    ? 'exception'
                    : status == configs.DELIVERY_STATUS_DISPATCHED
                      ? 'success'
                      : 'active'
            }
        />
    );
};

export { DeliveryProgressBar };
