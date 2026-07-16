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
import { Descriptions, Divider, Typography } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';

export interface IArgumentsProps {
    data?: any;
}

// renders the dynamic arguments of the assignment (extras JSON, flattened by the
// detail component into extras_KEY entries) as a readable key/value list
const WarehouseWorkerCustomPermissionArguments = ({ data }: IArgumentsProps) => {
    const { t } = useTranslation();

    const argumentEntries = Object.keys(data ?? {})
        .filter((key) => key.startsWith('extras_'))
        .map((key) => ({ argKey: key.replace('extras_', ''), argValue: data[key] }));

    if (argumentEntries.length === 0) return <></>;

    return (
        <>
            <Divider />
            <Typography.Title level={5}>{t('common:arguments')}</Typography.Title>
            <Descriptions bordered size="small" column={1}>
                {argumentEntries.map((entry) => (
                    <Descriptions.Item key={entry.argKey} label={entry.argKey}>
                        {`${entry.argValue}`}
                    </Descriptions.Item>
                ))}
            </Descriptions>
        </>
    );
};

export { WarehouseWorkerCustomPermissionArguments };
