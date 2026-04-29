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

import { useEffect } from 'react';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useExport, queryString, showInfo, showSuccess, showError } from '@helpers';
import { ExportFormat } from 'generated/graphql';
import { IListProps } from '../ListComponentV2';

interface UseExportDataProps {
    props: IListProps;
    newTableColumns: any[] | undefined;
    searchCriterias: any;
    pagination: {
        current: number;
        itemsPerPage: number;
    };
    sort: any;
    filteredLanguage: string;
    defaultModelSort: any;
    allColumns: any[];
    rows: { results: any[] } | undefined;
    displayedLabels: any;
}

export const useExportData = ({
    props,
    newTableColumns,
    searchCriterias,
    pagination,
    sort,
    filteredLanguage,
    defaultModelSort,
    allColumns,
    rows,
    displayedLabels
}: UseExportDataProps) => {
    const { t } = useTranslation();
    const { isLoading: exportLoading, result: exportResult, mutate } = useExport();

    const exportData = () => {
        const exportFields = [
            ...(props.extraColumns || []),
            ...(newTableColumns?.filter((col) => col.key !== 'actions') || [])
        ]
            .filter((col) => col.hidden !== true)
            .map((col) => {
                if (!col?.dataIndex?.includes('_')) {
                    return col?.dataIndex;
                }
                return (
                    col?.dataIndex?.split('_').join('{') +
                    '}'.repeat(col?.dataIndex?.split('_').slice(1).length || 0)
                );
            });

        const exportQueryString = queryString(
            props.dataModel.endpoints.list,
            exportFields,
            searchCriterias,
            pagination.current,
            pagination.itemsPerPage,
            sort,
            filteredLanguage,
            defaultModelSort
        );

        // Creation of columnNames for export
        let columnNames: any = {};
        const titleIndexMap: Record<string, number> = {};

        // Base from allColumns
        allColumns.forEach((col, index) => {
            const translatedTitle = t(col.title);
            columnNames[index] = {
                title: translatedTitle,
                keys: [col.dataIndex]
            };
            titleIndexMap[translatedTitle] = index;
        });

        // Add keys from rows
        if (rows && rows.results && rows.results.length > 0) {
            rows.results.forEach((result) => {
                Object.keys(result).forEach((key) => {
                    let title = `d:${key}`;
                    if (displayedLabels && key in displayedLabels) {
                        title = `d:${displayedLabels[key]}`;
                    }
                    const translatedTitle = t(title);

                    // If the value is an array, we skip it for now
                    if (!Array.isArray(result[key])) {
                        // If the key is similar to an existing columnName, we add it to that column keys
                        const similarColumns: any[] = Object.values(columnNames).filter(
                            (column: any) =>
                                column.keys.some((cnKey: any) => cnKey.startsWith(key + '_'))
                        );

                        if (similarColumns.length > 0) {
                            for (const col of similarColumns) {
                                col.keys.push(key);
                            }
                        }
                        // If title does not exist in allColumns, we create it
                        else {
                            const newIndex = Object.keys(columnNames).length;
                            columnNames[newIndex] = { title: translatedTitle, keys: [key] };
                            titleIndexMap[translatedTitle] = newIndex;
                        }
                    }
                });
            });
        }

        // Sort by index if needed
        const orderedColumns = Object.keys(columnNames)
            .sort((a, b) => Number(a) - Number(b))
            .map((idx) => columnNames[Number(idx)]);

        columnNames = orderedColumns;

        const base64QueryString = Buffer.from(exportQueryString, 'binary').toString('base64');
        mutate({
            graphqlRequest: base64QueryString,
            format: ExportFormat.Xlsx,
            separator: ';',
            columnNames
            // compression
        });
    };

    const stickyActions = {
        export: {
            active: props.dataModel.endpoints.export ? true : false,
            function: () => exportData()
        }
    };

    useEffect(() => {
        if (exportLoading) {
            showInfo(t('messages:info-export-wip'));
        }
    }, [exportLoading]);

    useEffect(() => {
        if (!(exportResult && exportResult.data)) return;
        if (exportResult.success && exportResult?.data.exportData?.url) {
            showSuccess(t('messages:success-exported'));
            const newWindow = window.open(exportResult?.data.exportData?.url, '_blank');
        } else {
            showError(t('messages:error-exporting-data'));
        }
    }, [exportResult]);

    return {
        exportData,
        exportLoading,
        exportResult,
        stickyActions
    };
};
