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
//DESCRIPTION: select a content among a list of contents corresponding to a given article and a given location

import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { WrapperForm, WrapperSlide, RadioButtons, ContentSpin } from '@components';
import { useHandlingUnitContents, LsIsSecured } from '@helpers';
import { Button, Carousel, Col, Divider, Form, Row, Typography } from 'antd';
import Text from 'antd/lib/typography/Text';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import parameters from '../../../../../common/parameters.json';
import { gql } from 'graphql-request';
import graphqlRequestClient from 'graphql/graphqlRequestClient';
import { ChangeStockStatusModal } from 'modules/Misc/HuInfo/Modals/ChangeStockStatusModal';

const { Title } = Typography;
export interface ISelectContentForHandlingUnitProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    HandlingUnitId: string;
    HideSelect?: any;
}

const StyledTitle = styled(Title)`
    margin: 0 !important;
`;

const SmallStyledButton = styled(Button)`
    background-color: #f4a261 !important;
    box-shadow: inset 0px 1px 0px 0px #f9eca0 !important;
    background: radial-gradient(circle, #f5c73d 70%, #f4a261 100%) !important;
    border: 1px solid #f5c73d !important;
    color: #000000 !important;
    position: absolute !important;
    bottom: 5px;
    font-size: 10px !important;
`;

const CarouselWrapper = styled(Carousel)`
    width: 90%;
    min-height: 130px;
    margin: auto;
    padding-bottom: 5px;
    > .slick-dots-bottom {
        bottom: 2px !important;
    }
    > .slick-dots li button {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: linear-gradient(to bottom, #f4a261 55%, #f5c73d 100%) !important;
    }
`;

export const SelectContentForHandlingUnitForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    HandlingUnitId,
    HideSelect
}: ISelectContentForHandlingUnitProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '[]');
    const router = useRouter();
    const [radio, setRadio] = useState<any>([]);
    const [showChangeStockStatusModal, setShowChangeStockStatusModal] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [refetch, setRefetch] = useState(false);

    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    useEffect(() => {
        const query = gql`
            query ListParametersForAScope($scope: String!, $code: String, $language: String) {
                listParametersForAScope(scope: $scope, code: $code, language: $language) {
                    id
                    text
                    scope
                    code
                }
            }
        `;
        const queryVariables = {
            language: router.locale,
            scope: 'radio'
        };

        graphqlRequestClient.request(query, queryVariables).then((data: any) => {
            setRadio(
                data?.listParametersForAScope.find(
                    (e: any) => e.scope === 'radio' && e.code === 'enableContentChange'
                )
            );
        });
    }, []);

    //SelectContentForHandlingUnit-1: query contents choices related to chosen handling unit id
    const handlingUnitContentsQuery = gql`
        query GetHandlingUnitContents(
            $filters: HandlingUnitContentSearchFilters
            $orderBy: [HandlingUnitContentOrderByCriterion!]
            $page: Int!
            $itemsPerPage: Int!
            $language: String = "en"
        ) {
            handlingUnitContents(
                filters: $filters
                orderBy: $orderBy
                page: $page
                itemsPerPage: $itemsPerPage
                language: $language
            ) {
                count
                itemsPerPage
                totalPages
                results {
                    id
                    stockOwnerId
                    stockOwner {
                        id
                        name
                    }
                    articleId
                    article {
                        description
                        name
                        featureTypeText
                        baseUnitWeight
                    }
                    quantity
                    stockStatus
                    stockStatusText
                    reservation
                    handlingUnitId
                    handlingUnit {
                        name
                        code
                        type
                        typeText
                        category
                        categoryText
                        locationId
                        location {
                            name
                            replenish
                            category
                            categoryText
                            block {
                                name
                            }
                        }
                        parentHandlingUnit {
                            name
                        }
                        stockOwner {
                            name
                        }
                    }
                    articleLuBarcodeId
                    articleLuBarcode {
                        barcodeId
                        barcode {
                            name
                        }
                    }
                    handlingUnitContentFeatures {
                        id
                        featureCodeId
                        featureCode {
                            id
                            name
                            unique
                        }
                        value
                    }
                }
            }
        }
    `;

    const variables = {
        filters: { handlingUnitId: HandlingUnitId },
        orderBy: [{ field: 'handlingUnit_location_category', ascending: true }],
        page: 1,
        itemsPerPage: 100
    };

    //SelectContentForHandlingUnit-2: set contents to provide to carousel & set the first selected content
    const [contents, setContents] = useState<any>([]);
    const [selectContent, setSelectContent] = useState<any>();
    useEffect(() => {
        graphqlRequestClient
            .request(handlingUnitContentsQuery, { ...variables, language: router.locale })
            .then((res: any) => {
                if (res?.handlingUnitContents) {
                    setContents(res.handlingUnitContents.results);
                    setSelectContent(
                        res.handlingUnitContents.results.find(
                            (e: any) => e.id === selectContent?.id
                        ) ?? res.handlingUnitContents.results[0]
                    );
                }
            });
    }, [HandlingUnitId, refetch]);

    //SelectContentForHandlingUnit-3: set stored chosenContent once select button is pushed
    const [chosenContent, setChosenContent] = useState<any>();
    useEffect(() => {
        if (chosenContent) {
            const data: { [label: string]: any } = {};
            data['chosenContent'] = contents.find((e: any) => e.id === chosenContent);
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        }
    }, [chosenContent]);

    //SelectContentForHandlingUnit-3b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    return (
        <>
            <WrapperForm>
                {contents ? (
                    <CarouselWrapper
                        arrows
                        prevArrow={<LeftOutlined />}
                        nextArrow={<RightOutlined />}
                        style={{ maxWidth: '95%' }}
                        afterChange={(current) => {
                            setCurrentIndex(current);
                            const visibleContent = contents[current];
                            setSelectContent(visibleContent);
                        }}
                    >
                        {contents && contents.length >= 1 ? (
                            contents.map((content: any, index: number, array: any) => (
                                <WrapperSlide key={content.id}>
                                    <StyledTitle level={3}>
                                        {t('common:content')} {index + 1}/{array.length}
                                    </StyledTitle>
                                    <Divider style={{ margin: 2 }} />
                                    <Row>
                                        <Col span={8}>
                                            <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                                {t('common:product')}:
                                            </Typography>
                                        </Col>
                                        <Col span={16}>
                                            <Typography style={{ fontSize: '10px' }}>
                                                {content.article?.description}
                                            </Typography>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col span={8}>
                                            <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                                {t('common:stock-owner_abbr')}:
                                            </Typography>
                                        </Col>
                                        <Col span={16}>
                                            <Typography style={{ fontSize: '10px' }}>
                                                {content.stockOwner?.name}
                                            </Typography>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col span={8}>
                                            <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                                {t('common:barcode_abbr')}:
                                            </Typography>
                                        </Col>

                                        {content.articleLuBarcode?.barcode && (
                                            <Col span={16}>
                                                <Typography style={{ fontSize: '10px' }}>
                                                    {content.articleLuBarcode?.barcode?.name}
                                                </Typography>
                                            </Col>
                                        )}
                                    </Row>
                                    <Row>
                                        <Col span={8}>
                                            <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                                {t('common:label')}:
                                            </Typography>
                                        </Col>
                                        <Col span={16}>
                                            <Typography style={{ fontSize: '10px' }}>
                                                {content.article?.name}
                                            </Typography>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col span={8}>
                                            <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                                {t('common:quantity_abbr')}:
                                            </Typography>
                                        </Col>
                                        <Col span={16}>
                                            <Typography style={{ fontSize: '10px' }}>
                                                {content.quantity}
                                            </Typography>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col span={8}>
                                            <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                                {t('common:stock-status')}:
                                            </Typography>
                                        </Col>
                                        <Col span={16}>
                                            <Typography style={{ fontSize: '10px' }}>
                                                {content.stockStatusText}
                                            </Typography>
                                        </Col>
                                    </Row>
                                    {content.handlingUnitContentFeatures.map(
                                        (huContentFeature: any, index: number) => (
                                            <Row key={index}>
                                                <Col span={8}>
                                                    <Typography
                                                        style={{
                                                            color: 'grey',
                                                            fontSize: '10px'
                                                        }}
                                                    >
                                                        {huContentFeature.featureCode.name}:
                                                    </Typography>
                                                </Col>
                                                <Col span={16}>
                                                    <Typography style={{ fontSize: '10px' }}>
                                                        {huContentFeature.value}
                                                    </Typography>
                                                </Col>
                                            </Row>
                                        )
                                    )}
                                    <Form
                                        name="basic"
                                        layout="vertical"
                                        onFinish={() => {
                                            setChosenContent(content.id);
                                        }}
                                        autoComplete="off"
                                        scrollToFirstError
                                        size="small"
                                    >
                                        {!HideSelect ? (
                                            <Row justify="center">
                                                <SmallStyledButton
                                                    block
                                                    style={{
                                                        height: '20px',
                                                        width: '50vw'
                                                    }}
                                                    htmlType="submit"
                                                >
                                                    {t('actions:select')}
                                                </SmallStyledButton>
                                            </Row>
                                        ) : (
                                            <></>
                                        )}
                                    </Form>
                                    <br />
                                    {radio?.text == 1 &&
                                    content.handlingUnit.category ==
                                        parameters.HANDLING_UNIT_CATEGORY_STOCK ? (
                                        <Row justify="center">
                                            <Button
                                                onClick={() => {
                                                    setShowChangeStockStatusModal(true);
                                                }}
                                            >
                                                {t('actions:change-content')}
                                            </Button>
                                        </Row>
                                    ) : (
                                        <></>
                                    )}
                                </WrapperSlide>
                            ))
                        ) : (
                            <Text type="warning">{t('messages:no-content')}</Text>
                        )}
                    </CarouselWrapper>
                ) : (
                    <ContentSpin />
                )}
                <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
            </WrapperForm>
            <ChangeStockStatusModal
                visible={showChangeStockStatusModal}
                showhideModal={() => {
                    setShowChangeStockStatusModal(!showChangeStockStatusModal);
                }}
                content={selectContent}
                id={selectContent?.id}
                setRefetch={setRefetch}
            />
        </>
    );
};
