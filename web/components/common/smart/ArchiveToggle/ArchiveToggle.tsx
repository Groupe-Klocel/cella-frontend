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
import { DatabaseOutlined } from '@ant-design/icons';
import { showInfo, useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Tooltip } from 'antd';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';
import { FC, useEffect, useRef, useState } from 'react';

export interface IArchiveToggleProps {
    /** `Table` enum value of the screen's model (`RECORD_HISTORY`), matched with `archiveTables` */
    tableName: string;
    active: boolean;
    onChange: (active: boolean) => void;
}

type ArchiveTable = {
    tableName: string;
    rowCount: number;
    boundaryMin?: string | null;
    boundaryMax?: string | null;
};

const ARCHIVE_TABLES = gql`
    query {
        archiveTables {
            tableName
            rowCount
            dateField
            boundaryMin
            boundaryMax
        }
    }
`;

// `RECORD_HISTORY` (Table enum) and `record_history` (archiveTables) name the same table
const normalize = (name: string): string => name.toLowerCase().replace(/_/g, '');

/**
 * "Include archives" toggle for the history screens: while active, the list reads production
 * plus the warehouse's archive (`withArchive: true`). The state belongs to the page and is never
 * saved.
 *
 * The archive is a dormant database that wakes up when queried, so this button sends nothing
 * before its first press. On that press it asks `archiveTables` once: the tooltip then shows the
 * archived period, and when nothing is archived for this table the button says so, switches itself
 * back off and stays disabled.
 */
const ArchiveToggle: FC<IArchiveToggleProps> = ({
    tableName,
    active,
    onChange
}: IArchiveToggleProps) => {
    const { t } = useTranslation();
    const { locale } = useRouter();
    const { graphqlRequestClient } = useAuth();
    // undefined: not asked yet, or the query failed (the button stays usable); null: nothing archived
    const [archive, setArchive] = useState<ArchiveTable | null | undefined>(undefined);
    const asked = useRef(false);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (!active || asked.current) {
            return;
        }
        asked.current = true;
        graphqlRequestClient
            .request(ARCHIVE_TABLES)
            .then((result: any) => {
                if (!mounted.current) {
                    return;
                }
                const tables: ArchiveTable[] = Array.isArray(result?.archiveTables)
                    ? result.archiveTables
                    : [];
                const found =
                    tables.find((table) => normalize(table.tableName) === normalize(tableName)) ??
                    null;
                setArchive(found);
                if (!found || found.rowCount === 0) {
                    showInfo(t('messages:no-archive'));
                    onChange(false);
                }
            })
            .catch((error: any) => {
                console.error('archiveTables: could not read', error);
            });
    }, [active]);

    const empty = archive === null || (archive !== undefined && archive.rowCount === 0);
    const formatDate = (value?: string | null): string =>
        value ? new Date(value).toLocaleDateString(locale) : '…';
    const tooltip =
        archive === undefined
            ? undefined
            : empty
              ? t('messages:no-archive')
              : t('messages:archive-range', {
                    from: formatDate(archive.boundaryMin),
                    to: formatDate(archive.boundaryMax)
                });

    return (
        <Tooltip title={tooltip}>
            <Button
                icon={<DatabaseOutlined />}
                type={active ? 'primary' : 'default'}
                disabled={empty}
                aria-pressed={active}
                onClick={() => onChange(!active)}
                data-testid="archive-toggle"
            >
                {t('actions:with-archive')}
            </Button>
        </Tooltip>
    );
};

ArchiveToggle.displayName = 'ArchiveToggle';

export { ArchiveToggle };
