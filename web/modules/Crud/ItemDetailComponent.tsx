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
import { ContentSpin, DetailsList } from '@components';
import { Alert, Layout, Typography } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import styled from 'styled-components';
import { flatten, getModesFromPermissions, showError, useDetail } from '@helpers';
import { ModelType } from 'models/Models';
import { useRouter } from 'next/router';
import { ModeEnum } from 'generated/graphql';
import { useAppState } from 'context/AppContext';
import { GroupItemDetailList } from './submodules/GroupItemDetailList';

const StyledPageContent = styled(Layout.Content)`
    margin: 15px 30px;
    padding: 20px;
`;

export interface ISingleItemProps {
    id: string | any;
    dataModel: ModelType;
    headerComponent: any;
    extraDataComponent?: any;
    setData?: any;
}

const ItemDetailComponent: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const router = useRouter();
    const [detailData, setDetailData] = useState<any>(null);
    const [displayedGrouping, setDisplayedGrouping] = useState<any>();

    const { detail, reload: reloadData } = useDetail(
        props.id,
        props.dataModel.endpoints.detail,
        props.dataModel.detailFields,
        router.locale
    );

    useEffect(() => {
        reloadData();
    }, [router.locale]);

    useEffect(() => {
        let flattenedData = flatten(detail.data[props.dataModel.endpoints.detail]);

        if (detail.data[props.dataModel.endpoints.detail]) {
            if (props.setData) props.setData(flattenedData);
            // Hide fields if there is any hidden selected.
            if (props.dataModel.excludedDetailFields)
                flattenedData = Object.keys(flattenedData)
                    .filter((key) => !props.dataModel.excludedDetailFields!.includes(key))
                    .reduce((obj: any, key: any) => {
                        obj[key] = flattenedData[key];

                        return obj;
                    }, {});

            // Update parsed data
            setDetailData(flattenedData);
        }
    }, [detail.data]);

    const tmp_array: any = [];

    useEffect(() => {
        if (props.dataModel.displayedDetailsGroups && detailData) {
            props.dataModel.displayedDetailsGroups.forEach((group: any) => {
                const groupedData = Object.keys(detailData)
                    .filter((key) => group.field.includes(key))
                    .reduce((obj: any, key: any) => {
                        obj[key] = detailData[key];
                        return obj;
                    }, {});

                const groupDataObject = {
                    title: group.title,
                    fields: groupedData
                };

                tmp_array.push(groupDataObject);
            });

            setDisplayedGrouping(tmp_array);
        }
    }, [detailData]);

    useEffect(() => {
        if (detail.error) {
            showError(t('messages:error-getting-data'));
        }
    }, [detail.error]);

    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Read) ? (
                    <>
                        <Alert
                            message={t('messages:error')}
                            description={t('errors:APP-000200')}
                            type="error"
                            showIcon
                        />
                    </>
                ) : (
                    <>
                        {props.headerComponent}

                        <StyledPageContent>
                            {!detail.isLoading ? (
                                detailData ? (
                                    <>
                                        {props.dataModel.displayedDetailsGroups &&
                                        displayedGrouping ? (
                                            <GroupItemDetailList
                                                displayedFieldGroup={displayedGrouping}
                                            />
                                        ) : (
                                            <DetailsList details={detailData} />
                                        )}
                                        {props.extraDataComponent ? (
                                            props.extraDataComponent
                                        ) : (
                                            <></>
                                        )}
                                    </>
                                ) : (
                                    <Typography>Content Does not exist</Typography>
                                )
                            ) : (
                                <ContentSpin />
                            )}
                        </StyledPageContent>
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

ItemDetailComponent.displayName = 'ItemDetailComponent';

export { ItemDetailComponent };
