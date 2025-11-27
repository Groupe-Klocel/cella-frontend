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
import { ContentSpin, DetailsList, HeaderContent } from '@components';
import { Alert, Button, Layout, Space, Typography } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import styled from 'styled-components';
import {
    flatten,
    getModesFromPermissions,
    showError,
    showInfo,
    showSuccess,
    useDelete,
    useDetail,
    useSoftDelete,
    useUpdate
} from '@helpers';
import { ModelType } from 'models/ModelsV2';
import { useRouter } from 'next/router';
import { ModeEnum } from 'generated/graphql';
import { useAppState } from 'context/AppContext';
import { GroupItemDetailList } from './submodules/GroupItemDetailList';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useAppDispatch } from 'context/AppContext';
import { ReloadOutlined } from '@ant-design/icons';

const { Link } = Typography;

const StyledPageContent = styled(Layout.Content)`
    padding: 15px 40px 15px 15px;
    margin: 0px 15px;
    position: relative;
`;

const WrapperStickyActions = styled.div`
    position: absolute;
    right: 0px;
    top: 50px;
    align-self: flex-end;
`;

export type HeaderData = {
    title: string;
    routes: Array<any>;
    actionsComponent: any;
    onBackRoute?: string;
};
export interface ISingleItemProps {
    id: string | any;
    dataModel: ModelType;
    triggerDelete: any;
    triggerSoftDelete?: any;
    triggerCancel?: any;
    triggerReopen?: any;
    headerComponent?: any;
    extraDataComponent?: any;
    setData?: any;
    headerData?: HeaderData;
    refetch?: boolean;
    refetchSubList?: any;
    isCreateAMovement?: boolean;
    dataToCreateMovement?: any;
    setSuccessDeleteResult?: any;
}

const ItemDetailComponent: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const router = useRouter();
    const [displayedGrouping, setDisplayedGrouping] = useState<any>();
    const { graphqlRequestClient } = useAuth();
    const dispatchToReducer = useAppDispatch();
    // Define pageName to retrieve screen permissions
    const pageName = router.pathname.split('/').filter(Boolean)[0];
    const permissionTableName = 'wm_' + pageName;

    // #region extract data from modelV2
    const detailFields = Object.keys(props.dataModel.fieldsInfo).filter(
        (key) => props.dataModel.fieldsInfo[key].isDetailRequested
    );

    const excludedDetailFields = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].isExcludedFromDetail)
        .map((obj) => {
            if (obj.includes('{')) {
                obj = obj.replaceAll('{', '_').replaceAll('}', '');
            }
            return obj;
        });
    const displayedLabels = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].displayName !== null)
        .reduce((obj: any, key) => {
            let newKey = key;
            if (key.includes('{')) {
                newKey = key.replaceAll('{', '_').replaceAll('}', '');
            }
            obj[newKey] = props.dataModel.fieldsInfo[key].displayName;
            return obj;
        }, {});
    // extract id, name and link from props.dataModel.fieldsInfo where link is not null
    const linkFields = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].link !== null)
        .map((key) => {
            const link = props.dataModel.fieldsInfo[key].link;
            const suffix = link?.substring(link?.lastIndexOf('/') + 1);
            if (suffix !== 'id') {
                return {
                    link,
                    name: key.replaceAll('{', '_').replaceAll('}', '')
                };
            } else {
                return [];
            }
        })
        .flat();

    // #region

    const [detailData, setDetailData] = useState<any>(null);
    const {
        isLoading,
        detail,
        reload: reloadData
    } = useDetail(props.id, props.dataModel.endpoints.detail, detailFields, router.locale);

    const tmp_titles = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].detailGroup !== null)
        .reduce((obj: any, key) => {
            obj[key] = props.dataModel.fieldsInfo[key].detailGroup;
            return obj;
        }, {});

    const displayedDetailsGroups: any[] = [];

    // #region split fields by groups
    const formatDisplayedGroup = Array.from(new Set(Object.values(tmp_titles)))
        .map((jsonString) => JSON.parse(jsonString as string))
        .sort((a, b) => a.position - b.position);

    formatDisplayedGroup.forEach((titleGroup: any) => {
        const displayedFieldGroups = Object.keys(tmp_titles).filter(
            (key) =>
                JSON.parse(props.dataModel.fieldsInfo[key].detailGroup as string).label ===
                titleGroup.label
        );

        const object = {
            title: titleGroup.label,
            field: displayedFieldGroups
        };
        displayedDetailsGroups.push(object);
    });

    const tmp_array: any = [];
    useEffect(() => {
        if (displayedDetailsGroups && detailData) {
            displayedDetailsGroups.forEach((group: any) => {
                displayedDetailsGroups.forEach((obj) => {
                    obj.field.forEach((field: string, index: number) => {
                        obj.field[index] = field.replaceAll('{', '_').replaceAll('}', '');
                    });
                });

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
    // #endregion

    useEffect(() => {
        console.log('reloadData');
        const timer = setTimeout(() => {
            reloadData();
        }, 200);
        return () => clearTimeout(timer);
    }, [props.refetch, router.locale]);

    useEffect(() => {
        if (detail?.data && detail?.data[props.dataModel.endpoints.detail]) {
            // Remove empty objects (e.g. extras) from detail?.data[props.dataModel.endpoints.detail]
            const detailObj = detail.data[props.dataModel.endpoints.detail];
            Object.keys(detailObj).forEach((key) => {
                if (
                    typeof detailObj[key] === 'object' &&
                    detailObj[key] !== null &&
                    Object.keys(detailObj[key]).length === 0
                ) {
                    delete detailObj[key];
                }
            });

            let flattenedData = flatten(detailObj);

            if (props.setData) props.setData(flatten(detailObj));
            // detect if linkfields.name is part of flattenedData keys and replace it if yes
            const keys = Object.keys(flattenedData); // get all the keys in flattenedData
            const linksList: Array<any> = [];
            for (const key of keys) {
                // loop through the keys
                const correspondingLinkObject = linkFields.find((item) => item.name === key); // find the object in linkFields with a name property equal to the key
                if (correspondingLinkObject) {
                    linksList.push(correspondingLinkObject);
                }
            }
            if (linksList.length > 0) {
                linksList.forEach((linkObject: any) => {
                    // if (Object.keys(linkObject).length !== 0) {
                    const suffix = linkObject?.link?.substring(
                        linkObject.link.lastIndexOf('/') + 1
                    );
                    //handle case where the suffix is at the end of a chain of characters
                    const recordKey = Object.keys(flattenedData).find((key) =>
                        key.endsWith(suffix!)
                    );
                    const link = `${linkObject?.link?.replace(`/${suffix}`, '')}/${
                        flattenedData[recordKey!]
                    }`;
                    const completeLink = `${process.env.NEXT_PUBLIC_WMS_URL}/${
                        router.locale !== 'en-US' ? router.locale + '/' : ''
                    }${link}`;
                    flattenedData[linkObject.name] = (
                        <Link href={completeLink}>{flattenedData[linkObject.name]}</Link>
                    );
                });
            }

            // Hide fields if there is any hidden selected.
            if (excludedDetailFields)
                flattenedData = Object.keys(flattenedData)
                    .filter(function (key) {
                        return (
                            !Array.isArray(flattenedData[key]) &&
                            !excludedDetailFields!.includes(key)
                        );
                    })
                    .reduce((obj: any, key: any) => {
                        obj[key] = flattenedData[key];
                        return obj;
                    }, {});
            // Update parsed data
            setDetailData(flattenedData);
        }
    }, [detail.data]);

    useEffect(() => {
        if (detail.error && modes.includes(ModeEnum.Read)) {
            showError(t('messages:error-getting-data'));
        }
    }, [detail.error]);

    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    // #retrieve path for redirection after delete:
    const pathAfterDelete = props?.headerData?.routes[props?.headerData?.routes.length - 2].path;
    // #region

    const createMovement = async (dataToCreateMovement: any) => {
        const executeFunctionQuery = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        let executeFunctionVariables = {
            functionName: 'create_movements',
            event: {
                input: {
                    content: dataToCreateMovement.content,
                    type: 'delete',
                    lastTransactionId: deleteResult.transactionId
                }
            }
        };

        const executeFunctionResult = await graphqlRequestClient.request(
            executeFunctionQuery,
            executeFunctionVariables
        );
    };
    // #region DELETE MUTATION
    const {
        isLoading: deleteLoading,
        result: deleteResult,
        mutate: callDelete
    } = useDelete(props.dataModel.endpoints.delete);

    useEffect(() => {
        if (props.triggerDelete && props.triggerDelete.idToDelete) {
            const deletePermission = permissions?.find(
                (permission) =>
                    permission.table === permissionTableName &&
                    permission.mode.toUpperCase() === ModeEnum.Delete
            );
            if (!deletePermission) {
                console.warn(
                    `User does not have permission for ${router.pathname} (${t('errors:APP-000200')})`
                );
                showError(t('errors:APP-000200'));
            } else {
                callDelete(props.triggerDelete.idToDelete);
            }
        }
    }, [props.triggerDelete]);

    useEffect(() => {
        if (deleteLoading) {
            showInfo(t('messages:info-delete-wip'));
        }
    }, [deleteLoading]);

    useEffect(() => {
        props.triggerDelete.setIdToDelete(undefined);
        if (!(deleteResult && deleteResult.data)) return;

        if (deleteResult.success) {
            showSuccess(t('messages:success-deleted'));
            if (props.setSuccessDeleteResult) props.setSuccessDeleteResult(deleteResult);
            // Dispatch the delete action to the reducer
            if (
                props.dataModel.endpoints.detail === 'config' ||
                props.dataModel.endpoints.detail === 'parameter'
            ) {
                dispatchToReducer({
                    type: ('delete_' + props.dataModel.endpoints.list).toUpperCase(),
                    [props.dataModel.endpoints.detail]: { id: props.triggerDelete.idToDelete }
                });
            }
            router.push(`${pathAfterDelete}`);
            if (props.isCreateAMovement) {
                try {
                    createMovement(props.dataToCreateMovement);
                } catch (error) {
                    console.error('Error creating movement:', error);
                    showError(t('messages:error-creating-movement'));
                }
            }
        } else {
            showError(t('messages:error-deleting-data'));
        }
    }, [deleteResult]);
    // #endregion

    // #region SOFT DELETE MUTATION
    const {
        isLoading: softDeleteLoading,
        result: softDeleteResult,
        mutate: callSoftDelete
    } = useSoftDelete(props.dataModel.endpoints.delete!);

    useEffect(() => {
        if (props.triggerSoftDelete && props.triggerSoftDelete.idToDisable) {
            const softDeletePermission = permissions?.find(
                (permission) =>
                    permission.table === permissionTableName &&
                    permission.mode.toUpperCase() === ModeEnum.Update
            );
            if (!softDeletePermission) {
                console.warn(
                    `User does not have permission for ${router.pathname} (${t('errors:APP-000200')})`
                );
                showError(t('errors:APP-000200'));
            } else {
                callSoftDelete(props.triggerSoftDelete.idToDisable);
                props.triggerSoftDelete.setIdToDisable(undefined);
                props?.refetchSubList?.setRefetchSubList(true);
            }
        }
    }, [props.triggerSoftDelete]);

    useEffect(() => {
        if (softDeleteLoading) {
            showInfo(t('messages:info-disabling-wip'));
        }
    }, [softDeleteLoading]);

    useEffect(() => {
        if (!(softDeleteResult && softDeleteResult.data)) return;

        if (softDeleteResult.success) {
            showSuccess(t('messages:success-disabled'));
            reloadData();
        } else {
            showError(t('messages:error-disabling-element'));
        }
    }, [softDeleteResult]);
    // #endregion

    // #region CANCEL MUTATION
    const {
        isLoading: cancelLoading,
        result: cancelResult,
        mutate: callCancel
    } = useUpdate(props.dataModel.resolverName, props.dataModel.endpoints.update, detailFields);

    useEffect(() => {
        if (props.triggerCancel && props.triggerCancel.cancelInfo) {
            callCancel({
                id: props.triggerCancel.cancelInfo.id,
                input: { status: props.triggerCancel.cancelInfo.status }
            });
            props.triggerCancel.setCancelInfo(undefined);
        }
    }, [props.triggerCancel]);

    useEffect(() => {
        if (cancelLoading) {
            showInfo(t('messages:info-canceling-wip'));
        }
    }, [cancelLoading]);

    useEffect(() => {
        if (!(cancelResult && cancelResult.data)) return;

        if (cancelResult.success) {
            showSuccess(t('messages:success-canceled'));
            reloadData();
        } else {
            showError(t('messages:error-canceling-data'));
        }
    }, [cancelResult]);

    // #endregion

    //#region REOPEN MUTATION
    const {
        isLoading: reopenLoading,
        result: reopenResult,
        mutate: callReopen
    } = useUpdate(props.dataModel.resolverName, props.dataModel.endpoints.update, detailFields);

    useEffect(() => {
        if (props.triggerReopen && props.triggerReopen.reopenInfo) {
            const softDeletePermission = permissions?.find(
                (permission) =>
                    permission.table === permissionTableName &&
                    permission.mode.toUpperCase() === ModeEnum.Update
            );
            if (!softDeletePermission) {
                console.warn(
                    `User does not have permission for ${router.pathname} (${t('errors:APP-000200')})`
                );
                showError(t('errors:APP-000200'));
            } else {
                callReopen({
                    id: props.triggerReopen.reopenInfo.id,
                    input: { status: props.triggerReopen.reopenInfo.status }
                });
                props.triggerReopen.setReopenInfo(undefined);
            }
        }
    }, [props.triggerReopen]);

    useEffect(() => {
        if (reopenLoading) {
            showInfo(t('messages:info-enabling-wip'));
        }
    }, [reopenLoading]);

    useEffect(() => {
        if (!(reopenResult && reopenResult.data)) return;

        if (reopenResult.success) {
            showSuccess(t('messages:success-enabled'));
            reloadData();
        } else {
            showError(t('messages:error-enabling-data'));
        }
    }, [reopenResult]);
    //#endregion

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
                        {props.headerData ? (
                            <HeaderContent
                                title={props.headerData.title}
                                routes={props.headerData.routes}
                                onBack={
                                    props.headerData.onBackRoute
                                        ? () => router.push(props.headerData!.onBackRoute!)
                                        : () => router.back()
                                }
                                actionsRight={
                                    <Space>
                                        {props.headerData.actionsComponent != null ? (
                                            props.headerData.actionsComponent
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                }
                            />
                        ) : (
                            <></>
                        )}

                        <StyledPageContent>
                            {!isLoading ? (
                                detailData ? (
                                    <>
                                        <WrapperStickyActions>
                                            <Space direction="vertical">
                                                <Button
                                                    icon={<ReloadOutlined />}
                                                    onClick={() => {
                                                        reloadData();
                                                    }}
                                                />
                                            </Space>
                                        </WrapperStickyActions>
                                        {displayedDetailsGroups.length > 0 && displayedGrouping ? (
                                            <GroupItemDetailList
                                                displayedFieldGroup={displayedGrouping}
                                                displayedLabels={displayedLabels}
                                            />
                                        ) : (
                                            <DetailsList
                                                details={detailData}
                                                displayedLabels={displayedLabels}
                                            />
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
