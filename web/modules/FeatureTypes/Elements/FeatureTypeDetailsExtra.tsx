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
import { DeleteOutlined, EditTwoTone, EyeTwoTone, LockTwoTone } from '@ant-design/icons';
import { pathParams, getModesFromPermissions, pathParamsFromDictionary } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Divider, Modal, Space, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { FeatureTypeDetailModelV2 } from '@helpers';
import { ArticleModelV2 } from '@helpers';
import { useState } from 'react';

const { Title } = Typography;

export interface IItemDetailsProps {
    parameterId?: string | any;
    featureType?: string | any;
}

const FeatureTypeDetailsExtra = ({ parameterId, featureType }: IItemDetailsProps) => {
    const { t } = useTranslation();

    const { permissions } = useAppState();
    const FeatureTypeDetailModes = getModesFromPermissions(permissions, Table.FeatureTypeDetail);
    const ArticleModes = getModesFromPermissions(permissions, Table.Article);
    const [idToDeleteFT, setIdToDeleteFT] = useState<string | undefined>();
    const [idToDisableFT, setIdToDisableFT] = useState<string | undefined>();
    const [idToDeleteArticle, setIdToDeleteArticle] = useState<string | undefined>();
    const [idToDisableArticle, setIdToDisableArticle] = useState<string | undefined>();

    const FeatureTypeDetailHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:feature-codes') }),
        routes: [],
        actionsComponent:
            FeatureTypeDetailModes.length > 0 &&
            FeatureTypeDetailModes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:associate', { name: t('common:feature-code') })}
                    path={pathParamsFromDictionary('/feature-types/details/add', {
                        parameterId: parameterId,
                        featureType
                    })}
                    type="primary"
                />
            ) : null
    };

    const ArticleData: HeaderData = {
        title: t('common:associated', { name: t('common:article') }),
        routes: [],
        actionsComponent: []
    };

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    return (
        <>
            {FeatureTypeDetailModes.length > 0 && FeatureTypeDetailModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ featureType: featureType }}
                        dataModel={FeatureTypeDetailModelV2}
                        headerData={FeatureTypeDetailHeaderData}
                        triggerDelete={{ idToDelete: idToDeleteFT, setIdToDelete: setIdToDeleteFT }}
                        triggerSoftDelete={{
                            idToDisable: idToDisableFT,
                            setIdToDisable: setIdToDisableFT
                        }}
                        routeDetailPage={'/feature-types/detail/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string }) => (
                                    <Space>
                                        {FeatureTypeDetailModes.length > 0 &&
                                        FeatureTypeDetailModes.includes(ModeEnum.Read) ? (
                                            <LinkButton
                                                icon={<EyeTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/feature-types/details/[id]',
                                                    {
                                                        id: record.id,
                                                        parameterId
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {FeatureTypeDetailModes.length > 0 &&
                                        FeatureTypeDetailModes.includes(ModeEnum.Update) &&
                                        FeatureTypeDetailModelV2.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/feature-types/details/edit/[id]',
                                                    {
                                                        id: record.id,
                                                        featureType
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {FeatureTypeDetailModes.length > 0 &&
                                        FeatureTypeDetailModes.includes(ModeEnum.Delete) &&
                                        FeatureTypeDetailModelV2.isSoftDeletable ? (
                                            <Button
                                                icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDisableFT,
                                                        'disable'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                        {FeatureTypeDetailModes.length > 0 &&
                                        FeatureTypeDetailModes.includes(ModeEnum.Delete) &&
                                        FeatureTypeDetailModelV2.isDeletable ? (
                                            <Button
                                                icon={<DeleteOutlined />}
                                                danger
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDeleteFT,
                                                        'delete'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                        searchable={false}
                    />
                </>
            ) : (
                <></>
            )}
            {ArticleModes.length > 0 && ArticleModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ featureType: featureType }}
                        dataModel={ArticleModelV2}
                        headerData={ArticleData}
                        triggerDelete={{
                            idToDelete: idToDeleteArticle,
                            setIdToDelete: setIdToDeleteArticle
                        }}
                        triggerSoftDelete={{
                            idToDisable: idToDisableArticle,
                            setIdToDisable: setIdToDisableArticle
                        }}
                        routeDetailPage={'/articles/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: {
                                    id: string;
                                    name: string;
                                    articleId: string;
                                }) => (
                                    <Space>
                                        {ArticleModes.length > 0 &&
                                        ArticleModes.includes(ModeEnum.Read) ? (
                                            <LinkButton
                                                icon={<EyeTwoTone />}
                                                path={pathParams('/articles/[id]', record.id)}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {ArticleModes.length > 0 &&
                                        ArticleModes.includes(ModeEnum.Update) &&
                                        ArticleModelV2.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/articles/edit/[id]',
                                                    {
                                                        id: record.id,
                                                        featureType
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {ArticleModes.length > 0 &&
                                        ArticleModes.includes(ModeEnum.Delete) &&
                                        ArticleModelV2.isSoftDeletable ? (
                                            <Button
                                                icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDisableArticle,
                                                        'disable'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                        {ArticleModes.length > 0 &&
                                        ArticleModes.includes(ModeEnum.Delete) &&
                                        ArticleModelV2.isDeletable ? (
                                            <Button
                                                icon={<DeleteOutlined />}
                                                danger
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDeleteArticle,
                                                        'delete'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
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

export { FeatureTypeDetailsExtra };
